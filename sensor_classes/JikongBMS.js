const BTSensor = require("../BTSensor");
let FakeDevice,FakeGATTService,FakeGATTCharacteristic;

// Dynamically import FakeBTDevice.js for node<= 20 
import('../development/FakeBTDevice.js')    
  .then(module => {
        FakeDevice = module.FakeDevice; 
        FakeGATTService= module.FakeGATTService
        FakeGATTCharacteristic=module.FakeGATTCharacteristic

    })
    .catch(error => {
        console.error('Error loading FakeBTDevice:', error);
    });

function sumByteArray(byteArray) {
 let sum = 0;
    for (let i = 0; i < byteArray.length; i++) {
     sum += byteArray[i];
   }
   return sum;
 }

const countSetBits=(n)=> {return (n == 0)?0:(n & 1) + countSetBits(n >> 1)};
class JikongBMS extends BTSensor {
      static Domain = BTSensor.SensorDomains.electrical

  static RX_SERVICE = "0000ffe0-0000-1000-8000-00805f9b34fb"  
  static RX_CHAR_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb"
  static validResponseHeader = 0x55aaeb90

  static commandResponse = {
    0x96: 0x02,
    0x97: 0x03
  }

     static async test(datafile){
     const data = require(datafile)
     const device = new FakeDevice(
      [new FakeGATTService(this.RX_SERVICE,
        [new FakeGATTCharacteristic(this.RX_CHAR_UUID,
          data.data["0x96"],data.delay
        )]
      )]
     )
     const obj = new JikongBMS(device,{offset:16})
     obj.currentProperties={Name:"Fake JKBMS", Address:"<mac>"}
     obj.debug=(m)=>{console.log(m)}
     obj.deviceConnect=()=>{}
     
    await obj.initSchema()
    await obj.initGATTInterval()
    for (const [tag,path] of Object.entries(obj._schema.properties.paths.properties)) {
      obj.on(tag, val=>{console.log(`${tag} => ${val} `)})
    }

  }
  static identify(device){
    return null
  }
  static ImageFile = "JikongBMS.jpg"

  jikongCommand(command) {
    var result = [0xaa, 0x55, 0x90, 0xeb, command, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ];
    result.push(Buffer.from([sumByteArray(result)])[0]);
    return result
  }

  async sendReadFunctionRequest( command ){    
    this.debug( `sending ${command}`)
    return await this.rxChar.writeValueWithoutResponse(Buffer.from(this.jikongCommand(command)))
  }

  async initSchema(){
      super.initSchema()
      this.addDefaultParam("batteryID")
      this.addParameter(
        "offset", {
          description: "Data offset",
          isRequired:true,
          default:16
        })
        await this.deviceConnect();
        const gattServer = await this.device.gatt();
        const rxService = await gattServer.getPrimaryService(
          this.constructor.RX_SERVICE
        );
        this.rxChar = await rxService.getCharacteristic(
          this.constructor.RX_CHAR_UUID
        );
        await this.rxChar.startNotifications();

        this.numberOfCells = await this.getNumberOfCells();

        for (let i = 0; i < this.numberOfCells; i++) {
          this.addMetadatum(
            `cell${i}Voltage`,
            "V",
            `Cell ${i + 1} voltage`,
            (buffer) => {
              return buffer.readUInt16LE(6 + i * 2) / 1000;
            }
          ).default = `electrical.batteries.{batteryID}.cell${i}.voltage`;
          this.addMetadatum(
            `cell${i}Resistance`,
            "ohm",
            `Cell ${i + 1} resistance in ohms`,
            (buffer) => {
              return buffer.readUInt16LE((i * 2) + 64+this.offset) / 1000;
            }
          ).default = `electrical.batteries.{batteryID}.cell${i}.resistance`;
        }
     
      this.addDefaultPath('voltage','electrical.batteries.voltage')
        .read=
        (buffer)=>{return buffer.readUInt16LE(118+this.offset*2) / 1000}

      this.addMetadatum(
        "power",
        "W",
        "Current battery power in Watts",
        (buffer) => {
          return buffer.readInt16LE(122 + this.offset*2) / 1000;
        }
      ).default = "electrical.batteries.{batteryID}.power";
 

      this.addDefaultPath('current','electrical.batteries.current')
        .read=
        (buffer)=>{return buffer.readInt16LE(126+this.offset*2) / 1000} 
      
      this.addDefaultPath('remainingCapacity','electrical.batteries.capacity.remaining')
        .read=(buffer)=>{return (buffer.readUInt32LE(142+this.offset*2) / 1000)*3600} 
      
      this.addDefaultPath('capacity','electrical.batteries.capacity.actual')
        .read=(buffer)=>{return (buffer.readUInt32LE(146+this.offset*2) / 1000)*3600} 
     
      this.addDefaultPath('cycles','electrical.batteries.cycles' )
        .read=(buffer)=>{return buffer.readUInt32LE(150+this.offset*2)} 

           
      this.addDefaultPath('SOC','electrical.batteries.capacity.stateOfCharge')
        .read=(buffer)=>{return buffer[158+this.offset*2]} 
      
      this.addMetadatum('runtime', 's', 'Total runtime in seconds',
          (buffer)=>{return buffer.readUInt32LE(162+this.offset*2)} )
          .default="electrical.batteries.{batteryID}.runtime"
      
      this.addMetadatum('charging', 'bool', 'MOSFET Charging enable',
          (buffer)=>{return buffer[166+this.offset*2]==1} )
          .default="electrical.batteries.{batteryID}.runtime"
       

        this.addMetadatum(
          "discharging", "bool", "MOSFET Disharging enable",
          (buffer) => {
            return buffer[167 + this.offset * 2]==1;
          }
        ).default = "electrical.batteries.{batteryID}.discharging";

        this.addMetadatum(
          "temp1", "K", "Temperature 1 in K",
          (buffer) => {
            return 273.15 + buffer.readInt16LE(130 + this.offset * 2) / 10;
          }
        ).default = "electrical.batteries.{batteryID}.temperature1";

        this.addMetadatum("temp2", "K", "Temperature 2 in K", (buffer) => {
          return 273.15+buffer.readInt16LE(132 + this.offset * 2) / 10;
        }).default = "electrical.batteries.{batteryID}.temperature2";
  
  }

  hasGATT(){
    return true
  }
  initGATTNotifications(){
    this.intervalID = setInterval( async ()=>{
        await this.emitGATT()
    }, 1000*(this?.pollFreq??10) )
  }

  async emitGATT(){
    try {
      await this.getAndEmitBatteryInfo()
    }
    catch (e) {
      this.debug(`Failed to emit battery info for ${this.getName()}: ${e}`)
    }
}

  async getNumberOfCells(){
    const b = await this.getBuffer(0x96)
    return countSetBits(b.readUInt32BE(70))
  }  


  getBuffer (command){

    return new Promise( async ( resolve, reject )=>{
        const r = await this.sendReadFunctionRequest(command)
        let datasize = 300
        let result = Buffer.alloc(datasize)
        let offset = 0
        
        const timer = setTimeout(() => {
          clearTimeout(timer)
          reject(new Error(`Response timed out (+30s) getting results for command ${command} from JBDBMS device ${this.getName()}.`));
        }, 300000);

        const valChanged = async (buffer) => {
          if (offset==0 && //first packet
             (buffer.length < 5 ||  buffer.readUInt32BE(0)!==this.constructor.validResponseHeader))
                this.debug(`Invalid buffer ${JSON.stringify(buffer)}from ${this.getName()}, not processing.`)
          else {
            buffer.copy(result,offset)
            if (offset+buffer.length==datasize){
              if (result[4] == this.constructor.commandResponse[command]) {
                this.rxChar.removeAllListeners()
                clearTimeout(timer)
                resolve(result)
              } else{
                this.debug(`Invalid command response in buffer ${JSON.stringify(result)} from ${this.getName()}, not processing.`)
                offset=0
                result = Buffer.alloc(datasize)
              }
            } else{ 
              offset+=buffer.length
            }
          }
        }
        this.rxChar.on('valuechanged', valChanged )
    })
} 

async initGATTConnection() {
  return this  
}

async getAndEmitBatteryInfo(){
    this.getBuffer(0x96).then( (buffer )=>{
    (["current", "voltage", "remainingCapacity", "capacity","cycles", "charging", "discharging", "SOC","runtime", "temp1", "temp2"]).forEach((tag) =>
      this.emitData( tag, buffer )
    )
    for (let i = 0; i<this.numberOfCells; i++){
      this.emitData(`cell${i}Voltage`,buffer)    
      this.emitData(`cell${i}Resistance`,buffer)    
    }
  })
    
  
}


async initGATTInterval(){
   
  await this.emitGATT()
   this.initGATTNotifications()
}

async stopListening(){
  super.stopListening()
  if (this.rxChar) 
    this.rxChar.stopNotifications()
  if (this.device)
    await this.device.disconnect()
}
  
}

module.exports = JikongBMS;