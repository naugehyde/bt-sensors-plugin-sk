const BTSensor = require("../BTSensor.js");
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
//({FakeDevice,FakeGATTService,FakeGATTCharacteristic }=require( "../development/FakeBTDevice.js"))
//a1000000650000000000180103440018004800640531ff8000002710000100010000000000000000000100020000ffff00000000000000000000000000000000000000000000000000000000000000000000418b
//a20000006500000000001801035600040cfb0cfd0cfb0cfaffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000300cd00c000befc18fc18fc18fc18fc18fc18976a

/*
        BMSdp("battery_level", 16, 2, False, lambda x: x, 0xA1),
        BMSdp("voltage", 20, 2, False, lambda x: x / 100, 0xA1),
        BMSdp("current", 22, 2, True, lambda x: x / 100, 0xA1),
        BMSdp("problem_code", 51, 2, False, lambda x: x, 0xA1),
        BMSdp("design_capacity", 26, 2, False, lambda x: x // 100, 0xA1),
        BMSdp("cell_count", _CELL_POS, 2, False, lambda x: x, 0xA2),
        BMSdp("temp_sensors", _TEMP_POS, 2, False, lambda x: x, 0xA2),
        # ("cycles", 0xA1, 8, 2, False, lambda x: x),
*/

function waitForVariable(obj, variableName, interval = 100) {
  return new Promise((resolve) => {
    if (obj[variableName] !== undefined) {
      return resolve(obj[variableName]);
    }

    const intervalId = setInterval(() => {
      if (obj[variableName] !== undefined) {
        clearInterval(intervalId);
        resolve(obj[variableName]);
      }
    }, interval);
  });
}

class EcoWorthyBW02 extends BTSensor {
      static Domain = BTSensor.SensorDomains.electrical

  static TX_RX_SERVICE = "0000fff0-0000-1000-8000-00805f9b34fb"  
  static NOTIFY_CHAR_UUID = "0000fff1-0000-1000-8000-00805f9b34fb"

   static async test(data=["a1000000650000000000180103440018004800640531ff8000002710000100010000000000000000000100020000ffff00000000000000000000000000000000000000000000000000000000000000000000418b",
                    "a20000006500000000001801035600040cfb0cfd0cfb0cfaffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000300cd00c000befc18fc18fc18fc18fc18fc18976a"
  ]){
     const device = new FakeDevice(
      [new FakeGATTService("0000fff0-0000-1000-8000-00805f9b34fb",
        [new FakeGATTCharacteristic("0000fff1-0000-1000-8000-00805f9b34fb",
          data
        )]
      )]
     )
     const obj = new EcoWorthyBW02(device)
     obj.currentProperties={Name:"Fake EcoWorthy", Address:"<mac>"}
     obj.debug=(m)=>{console.log(m)}
     obj.deviceConnect=()=>{}
    await obj.initSchema()
    for (const [tag,path] of Object.entries(obj._schema.properties.paths.properties)) {
      obj.on(tag, val=>{console.log(`${tag} => ${val} `)})
    }

  }
  
  static identify(device){
    return null
  }
  static ImageFile = "EcoWorthyBW02.webp"
  
  async initSchema(){
      super.initSchema()
      this.addDefaultParam("batteryID")
     
      this.addDefaultPath('voltage','electrical.batteries.voltage')
        .read=
        (buffer)=>{return buffer.readUInt16BE(20) / 100}

      this.addDefaultPath('current','electrical.batteries.current')
        .read=
        (buffer)=>{return buffer.readInt16BE(22) / 100} 
      
      this.addDefaultPath('remainingCapacity','electrical.batteries.capacity.remaining')
        //.read=(buffer)=>{return (buffer.readUInt16BE(8) / 100)*3600} 
      
      this.addDefaultPath('capacity','electrical.batteries.capacity.actual')
        .read=(buffer)=>{return (buffer.readUInt16BE(26) / 100)*3600} 
     
        this.addDefaultPath('SOC','electrical.batteries.capacity.stateOfCharge')
        .read=(buffer)=>{return buffer.readUInt16BE(16)/100} 
  
        await this.initGATTConnection()
        await this.initGATTNotifications()
        await waitForVariable(this,"numberOfTemps")
        await waitForVariable(this,"numberOfCells")

      for (let i=0; i<this.numberOfTemps; i++){
        this.addMetadatum(`temp${i}`, 'K', `Temperature${i+1} reading`,
          (buffer)=>{
            return buffer.readUInt16BE(82+(i*2))/10
          })
         .default=`electrical.batteries.{batteryID}.Temperature${i+1}`
      }
      
      for (let i=0; i<this.numberOfCells; i++){
        this.addMetadatum(`cell${i}Voltage`, 'V', `Cell ${i+1} voltage`,
          (buffer)=>{return buffer.readUInt16BE((16+(i*2)))/1000} )
          .default=`electrical.batteries.{batteryID}.cell${i+1}.voltage`
      }
  }

  hasGATT(){
    return true
  }
  usingGATT(){
    return true
  }

  async initGATTNotifications(){
      await this.rxChar.startNotifications()
      
      this.rxChar.on("valuechanged", (buffer)=>{
        if (buffer[0]==0xA1){
           (["current", "voltage", "remainingCapacity", "capacity", "SOC" ]).forEach((tag) =>
             this.emitData( tag, buffer )
            )
        } else 
          if (buffer[0]==0xA2){
            
            if (!this.numberOfCells){
              this.numberOfCells=buffer[15]
            }      
            if (!this.numberOfTemps){
              this.numberOfTemps=buffer[81]
            }
            for (let i=0;i<this.numberOfCells;i++){
              this.emitData(`cell${i+1}Voltage`, buffer)
            }
            for (let i=0;i<this.numberOfTemps;i++){
              this.emitData(`temp${i+1}`, buffer)
                      
            }    
          }
      })
  }
async initGATTConnection(isReconnecting) {
   await super.initGATTConnection(isReconnecting) 
   const gattServer = await this.getGATTServer()
   const txRxService= await gattServer.getPrimaryService(this.constructor.TX_RX_SERVICE)
   this.rxChar = await txRxService.getCharacteristic(this.constructor.NOTIFY_CHAR_UUID)
  return this  
}

  async deactivateGATT(){
      await this.stopGATTNotifications(this.rxChar)
      await super.deactivateGATT()
  }
}
module.exports = EcoWorthyBW02;