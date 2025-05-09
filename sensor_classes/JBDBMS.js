const BTSensor = require("../BTSensor");
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
class JBDBMS extends BTSensor {

  static TX_RX_SERVICE = "0000ff00-0000-1000-8000-00805f9b34fb"  
  static NOTIFY_CHAR_UUID = "0000ff01-0000-1000-8000-00805f9b34fb"
  static WRITE_CHAR_UUID  = "0000ff02-0000-1000-8000-00805f9b34fb"
  
  constructor(device,config,gattConfig){
      super(device,config,gattConfig)
      this.emitterFunctions=
                [this.getAndEmitBatteryInfo.bind(this), 
                this.getAndEmitCellVoltages.bind(this)]
      
  }
  static identify(device){
    return null
  }
  jbdCommand(command) {
    return [0xDD, 0xA5, command, 0x00, 0xFF, 0xFF - (command - 1), 0x77]
  }

  async sendReadFunctionRequest( command ){    
    return await this.txChar.writeValueWithResponse(Buffer.from(this.jbdCommand(command)))

}
  async init(){
      await super.init()
      this.addMetadatum('voltage', 'V', 'Total battery voltage', 
        (buffer)=>{return buffer.readUInt16BE(4) / 100})
      this.addMetadatum('current',  'A',  'Current flow',
        (buffer)=>{return buffer.readInt16BE(6) / 100} )
      this.addMetadatum('remainingCapacity', 'Ah',  'Remaining battery capacity', 
        (buffer)=>{return buffer.readUInt16BE(8) / 100} )
      this.addMetadatum('capacity', 'Ah',  'Battery capacity', 
        (buffer)=>{return buffer.readUInt16BE(10) / 100} )
      this.addMetadatum('cycles', '', 'cycles',
        (buffer)=>{return buffer.readUInt16BE(12)} )
      this.addMetadatum('protectionStatus', '', 'Protection Status',
          (buffer)=>{return buffer.readUInt16BE(20)} )
        
      this.addMetadatum('SOC', 'ratio', 'State of Charge',
        (buffer)=>{return buffer.readUInt8(23)/100} )
      
      this.addMetadatum('FET', '', 'FET Control',
          (buffer)=>{return buffer.readUInt8(24)} )
  
      await this.device.connect()
      await this.initCharacteristics()
      const cellsAndTemps = await this.getNumberOfCellsAndTemps()
      this.numberOfCells=cellsAndTemps.cells
      this.numberOfTemps=cellsAndTemps.temps

      for (let i=0; i<this.numberOfTemps; i++){
        this.addMetadatum(`temp${i}`, 'K', `Temperature${i+1} reading`,
          (buffer)=>{
            return buffer.readUInt16BE(27+(i*2))/10
          })
      }
      
      for (let i=0; i<this.numberOfCells; i++){
        this.addMetadatum(`cell${i}Voltage`, 'V', `Cell ${i+1} voltage`,
          (buffer)=>{return buffer.readUInt16BE((4+(i*2)))/1000} )
        this.addMetadatum(`cell${i}Balance`, 'V', `Cell ${i+1} balance` )
      }


    }
  hasGATT(){
    return true
  }
  initCharacteristics(){ 
    return new Promise((resolve,reject )=>{ this.device.connect().then(async ()=>{ 
      const gattServer = await this.device.gatt()
      const txRxService= await gattServer.getPrimaryService(this.constructor.TX_RX_SERVICE)
      this.rxChar = await txRxService.getCharacteristic(this.constructor.NOTIFY_CHAR_UUID)
      this.txChar = await txRxService.getCharacteristic(this.constructor.WRITE_CHAR_UUID)
      await this.rxChar.startNotifications()
      resolve(this)
    }) .catch((e)=>{ reject(e.message) }) }) 
  }

  async initGATTNotifications(){
    this.intervalID = setInterval(()=>{
        this.emitGATT()
    }, 1000*(this?.pollFreq??60) )
  }

  emitGATT(){
    this.getAndEmitBatteryInfo()
    setTimeout(()=>{this.getAndEmitCellVoltages()}, 5000)
  }

  async getNumberOfCellsAndTemps(){
    var b = await this.getBuffer(0x3)
    return {cells:b[25], temps:b[26]}
  }  
  
  getBuffer(command){

    return new Promise( async ( resolve, reject )=>{
        const r = await this.sendReadFunctionRequest(command)
        const result = Buffer.alloc(256)
        var offset = 0

        const timer = setTimeout(() => {
          clearTimeout(timer)
          reject(new Error(`Response timed out from JBDBMS device ${this.getName()}. `));
        }, 30000);

        const valChanged = async (buffer) => {
          this.debug(buffer)
          buffer.copy(result,offset)
          if (buffer[buffer.length-1]==0x77){
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

getAndEmitBatteryInfo(){
  this.getBuffer(0x03).then((buffer)=>{
    (["current", "voltage", "remainingCapacity", "capacity","cycles", "protectionStatus", "SOC","FET",]).forEach((tag) =>
      this.emitData( tag, buffer )
    )
    for (let i = 0; i<this.numberOfTemps; i++){
      this.emitData(`temp${i}`,buffer)    
    }
    const balances = buffer.readUInt32BE(16)

    for (let i = 0; i<this.numberOfCells; i++){
      this.emit(`cell${i}Balance`,(1<<i & balances)?1:0)
    }
  })
}

getAndEmitCellVoltages(){
  this.getBuffer(0x4).then((buffer)=>{
    for (let i=0; i<this.numberOfCells; i++){
      this.emitData(`cell${i}Voltage`,buffer)
  }})
}

initGATTInterval(){
  this.initGATTNotifications()
}

async stopListening(){
  super.stopListening()
  this.rxChar.stopNotifications()
  await this.device.disconnect()
}
  
}

module.exports = JBDBMS;