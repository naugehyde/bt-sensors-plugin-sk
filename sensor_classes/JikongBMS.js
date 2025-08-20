const BTSensor = require("../BTSensor");
function sumByteArray(byteArray) {
 let sum = 0;
    for (let i = 0; i < byteArray.length; i++) {
     sum += byteArray[i];
   }
   return sum;
 }

const countSetBits=(n)=> {return (n == 0)?0:(n & 1) + countSetBits(n >> 1)};
const validResponseHeader = 0x55aaeb90
class JikongBMS extends BTSensor {
      static Domain = BTSensor.SensorDomains.electrical

  static RX_SERVICE = "0000ffe0-0000-1000-8000-00805f9b34fb"  
  static RX_CHAR_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb"

  static commandResponse = {
    0x97: 0x02,
    0x96: 0x03
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
     
      this.addDefaultPath('voltage','electrical.batteries.voltage')
        .read=
        (buffer)=>{return buffer.readUInt16BE(4) / 100}

      this.addDefaultPath('current','electrical.batteries.current')
        .read=
        (buffer)=>{return buffer.readInt16BE(6) / 100} 
      
      this.addDefaultPath('remainingCapacity','electrical.batteries.capacity.remaining')
        .read=(buffer)=>{return (buffer.readUInt16BE(8) / 100)*3600} 
      
      this.addDefaultPath('capacity','electrical.batteries.capacity.actual')
        .read=(buffer)=>{return (buffer.readUInt16BE(10) / 100)*3600} 
     
      this.addDefaultPath('cycles','electrical.batteries.cycles' )
        .read=(buffer)=>{return buffer.readUInt16BE(12)} 

      this.addMetadatum('protectionStatus', '', 'Protection Status',
        (buffer)=>{return buffer.readUInt16BE(20)} )
        .default="electrical.batteries.{batteryID}.protectionStatus"
         
      this.addDefaultPath('SOC','electrical.batteries.capacity.stateOfCharge')
        .read=(buffer)=>{return buffer.readUInt8(23)/100} 
      
      this.addMetadatum('FET', '', 'FET Control',
          (buffer)=>{return buffer.readUInt8(24)} )
          .default="electrical.batteries.{batteryID}.FETControl"
  
        await this.deviceConnect() 
        const gattServer = await this.device.gatt()
        const rxService= await gattServer.getPrimaryService(this.constructor.RX_SERVICE)
        this.rxChar = await rxService.getCharacteristic(this.constructor.RX_CHAR_UUID)
        await this.rxChar.startNotifications()
 
        this.numberOfCells= await this.getNumberOfCells()

      for (let i=0; i<this.numberOfCells; i++){
        this.addMetadatum(`cell${i}Voltage`, 'V', `Cell ${i+1} voltage`,
          (buffer)=>{return buffer.readUInt16BE((4+(i*2)))/1000} )
          .default=`electrical.batteries.{batteryID}.cell${i}.voltage`
        this.addMetadatum(`cell${i}Resistance`, 'ohm', `Cell ${i+1} resistance in ohms` )
          .default=`electrical.batteries.{batteryID}.cell${i}.resistance`
        
      }
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
    const b = await this.getBuffer(0x97)
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
          reject(new Error(`Response timed out (+30s) from JBDBMS device ${this.getName()}. `));
        }, 30000);

        const valChanged = async (buffer) => {
          if (offset==0){ //first packet
            if (buffer.length < 5 || 
                buffer.subArray(0,4)!==this.constructor.validResponseHeader || 
                buffer[4] !== this.constructor.commandResponse[command])
                reject(`Invalid buffer from ${this.getName()}, not processing.`)
          }
          buffer.copy(result,offset)
          if (result.length==datasize){
            
            this.rxChar.removeAllListeners()
            clearTimeout(timer)
            resolve(result)
          }
          offset+=buffer.length
        }
        this.rxChar.on('valuechanged', valChanged )
    })
} 

async initGATTConnection() {
  return this  
}

async getAndEmitBatteryInfo(){
    return this.getBuffer(0x97).then((buffer)=>{
    (["current", "voltage", "remainingCapacity", "capacity","cycles", "protectionStatus", "SOC","FET",]).forEach((tag) =>
      this.emitData( tag, buffer )
    )
    for (let i = 0; i<this.numberOfCells; i++){
      this.emitData(`cell${i}Voltage`,buffer)    
      this.emitData(`cell${i}Resistance`,buffer)    
    }
    
  })
}


initGATTInterval(){
   
  this.emitGATT()
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