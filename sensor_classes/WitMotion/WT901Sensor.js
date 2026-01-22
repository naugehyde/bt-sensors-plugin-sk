const BTSensor = require("../../BTSensor");

class WT901Sensor extends  BTSensor {
    static Domain = this.SensorDomains.environmental
    static ManufacturerUUID = '0000ffe5-0000-1000-8000-00805f9a34fb'
    static async  identify(device){

        const name = await this.getDeviceProp(device,"Name")
        const uuids = await this.getDeviceProp(device,'UUIDs')

        if (name && name.match(this.getIDRegex()) &&
            uuids && uuids.length > 0 &&
            uuids[0] == this.ManufacturerUUID)
            return this
        else
            return null

    }

    getManufacturer(){
        return "WitMotion"
    }
    wt901ReadReg(regAddr) {
        return [0xff, 0xaa, 0x27, regAddr, 0x00];
    }

    /**
     * Send read register command (used to get quaturnions)
     */
    async sendCommand(regAddr) {
        this.debug(`Sending command 0x${regAddr}`);
        return await this.txChar.writeValue(
            Buffer.from(this.wt901ReadReg(regAddr))
        );
    }

    getSignInt16(num) {
        if (num >= Math.pow(2, 15)) {
            num -= Math.pow(2, 16);
        }
        return num;
    }

    processData(Bytes) {
        if (Bytes[1] === 0x61) {
            let Ax = this.getSignInt16((Bytes[3] << 8) | Bytes[2]) / 32768 * 16;
            let Ay = this.getSignInt16((Bytes[5] << 8) | Bytes[4]) / 32768 * 16;
            let Az = this.getSignInt16((Bytes[7] << 8) | Bytes[6]) / 32768 * 16;
            let Gx = this.getSignInt16((Bytes[9] << 8) | Bytes[8]) / 32768 * 2000;
            let Gy = this.getSignInt16((Bytes[11] << 8) | Bytes[10]) / 32768 * 2000;
            let Gz = this.getSignInt16((Bytes[13] << 8) | Bytes[12]) / 32768 * 2000;
            let AngX = this.getSignInt16((Bytes[15] << 8) | Bytes[14]) / 32768 * 180;
            let AngY = this.getSignInt16((Bytes[17] << 8) | Bytes[16]) / 32768 * 180;
            let AngZ = this.getSignInt16((Bytes[19] << 8) | Bytes[18]) / 32768 * 180;

            this.set("AccX", Math.round(Ax * 1000) / 1000);
            this.set("AccY", Math.round(Ay * 1000) / 1000);
            this.set("AccZ", Math.round(Az * 1000) / 1000);
            this.set("AsX", Math.round(Gx * 1000) / 1000);
            this.set("AsY", Math.round(Gy * 1000) / 1000);
            this.set("AsZ", Math.round(Gz * 1000) / 1000);
            this.set("AngX", Math.round(AngX * 1000) / 1000);
            this.set("AngY", Math.round(AngY * 1000) / 1000);
            this.set("AngZ", Math.round(AngZ * 1000) / 1000);
            //this.debugLog(this.data)
            this.emitAttitude()

        } else {
            // magnetic field
            if (Bytes[2] === 0x3A) {
                let Hx = this.getSignInt16((Bytes[5] << 8) | Bytes[4]) / 120;
                let Hy = this.getSignInt16((Bytes[7] << 8) | Bytes[6]) / 120;
                let Hz = this.getSignInt16((Bytes[9] << 8) | Bytes[8]) / 120;

                this.set("HX", Math.round(Hx * 1000) / 1000);
                this.set("HY", Math.round(Hy * 1000) / 1000);
                this.set("HZ", Math.round(Hz * 1000) / 1000);
            }
            // Quaternion
            else if (Bytes[2] === 0x51) {
                let Q0 = this.getSignInt16((Bytes[5] << 8) | Bytes[4]) / 32768;
                let Q1 = this.getSignInt16((Bytes[7] << 8) | Bytes[6]) / 32768;
                let Q2 = this.getSignInt16((Bytes[9] << 8) | Bytes[8]) / 32768;
                let Q3 = this.getSignInt16((Bytes[11] << 8) | Bytes[10]) / 32768;

                this.set("Q0", Math.round(Q0 * 100000) / 100000);
                this.set("Q1", Math.round(Q1 * 100000) / 100000);
                this.set("Q2", Math.round(Q2 * 100000) / 100000);
                this.set("Q3", Math.round(Q3 * 100000) / 100000);
            } else {
                // pass
            }
        }
    }

    set(key, value) {
        // Implement your set method here
        this.data[key] = value;
    }

    quaternionToEuler(q_w, q_x, q_y, q_z) {
        // Roll (x-axis rotation)
        const roll = Math.atan2(2 * (q_w * q_x + q_y * q_z), 1 - 2 * (q_x ** 2 + q_y ** 2));

        // Pitch (y-axis rotation)
        const pitch = Math.asin(2 * (q_w * q_y - q_z * q_x));

        // Yaw (z-axis rotation)
        const yaw = Math.atan2(2 * (q_w * q_z + q_x * q_y), 1 - 2 * (q_y ** 2 + q_z ** 2));

        return [roll, pitch, yaw];
    }


    emitAttitude(packedValue, tempIsNegative ){
        //const att = this.quaternionToEuler(this.data.Q0,this.data.Q1,this.data.Q2,this.data.Q3)
        this.emit("roll", this.data.AngX)
        this.emit("pitch", this.data.AngY)
        this.emit("yaw", this.data.AngZ)
    }

    async propertiesChanged(props){
        super.propertiesChanged(props)
        if (!props.hasOwnProperty("ManufacturerData")) return

        const buffer = this.getManufacturerData(this.constructor.DATA_ID)
        if (buffer) {
            this.emitValuesFrom(buffer)
        }
   }
}
module.exports=WT901Sensor
