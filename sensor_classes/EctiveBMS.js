const BTSensor = require("../BTSensor");

/*
"5e353433373030303030303030303030303438453830313030313030303633303043303042303038303837463433413045303530453033304530463044303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303537440000"*/
class EctiveBMS extends BTSensor {
  static Domain = BTSensor.SensorDomains.electrical

  static RX_SERVICE = "0000ff00-0000-1000-8000-00805f9b34fb"  
  static NOTIFY_CHAR_UUID = "0000ff04-0000-1000-8000-00805f9b34fb"
  
  static identify(device){
    return null
  }

  _dataBuffer=null

  async initSchema(){
      super.initSchema()
      this.addDefaultParam("batteryID")
      this.addParameter(
        "numberOfCells",
        {
                title:'number of cells in battery',
                type: 'integer',
                default: 4,
                isRequired: true
            }
      )
     
      this.addDefaultPath('voltage','electrical.batteries.voltage')
        .read=
        (buffer)=>{return buffer.readUInt16LE(0) / 1000}

      this.addDefaultPath('current','electrical.batteries.current')
        .read=
        (buffer)=>{return buffer.readInt16LE(2) / 1000} 

       this.addMetadatum(`cycleCharge`, 'C', `cycle charge`,
          (buffer)=>{
            return 3600*(buffer.readUInt16LE(4)/1000)
          })
         .default=`electrical.batteries.{batteryID}.cycleCharge`

      
      this.addDefaultPath('remainingCapacity','electrical.batteries.capacity.remaining')
        .read=(buffer)=>{return (buffer.readUInt16BE(8) / 100)*3600} 
      
      this.addDefaultPath('capacity','electrical.batteries.capacity.actual')
        .read=(buffer)=>{return (buffer.readUInt16BE(10) / 100)*3600} 
     
      this.addDefaultPath('cycles','electrical.batteries.cycles' )
        .read=(buffer)=>{return buffer.readUInt16BE(12)} 

      this.addDefaultPath('SOC','electrical.batteries.capacity.stateOfCharge')
        .read=(buffer)=>{return buffer.readUInt8(15)/100} 
      
        this.addMetadatum(`temp`, 'K', `Temperature reading`,
          (buffer)=>{
            return buffer.readUInt16BE(27+(i*2))/10
          })
         .default=`electrical.batteries.{batteryID}.temperature`
      
      
      for (let i=0; i<this?.numberOfCells??4; i++){
        this.addMetadatum(`cell${i}Voltage`, 'V', `Cell ${i+1} voltage`,
          (buffer)=>{return buffer.readUInt16BE((4+(i*2)))/1000} )
          .default=`electrical.batteries.{batteryID}.cell${i}.voltage`
      }
  }

  hasGATT(){
    return true
  }

  updateBuffer(data){
    const _data = Buffer.from(data.toString("utf-8"),"hex")
            if (_data[0]==0x5E){
                this._dataBuffer=_data.subarray(1)
            }
            else {
                this._dataBuffer=Buffer.concat([this._dataBuffer, _data])
            }
            if (_data.includes(0x00)){
                this.emitValuesFrom(this._dataBuffer)
            }
    }

  async initGATTNotifications(){
         await this.rxChar.startNotifications()
         this.rxChar.on("valueChanged", (data)=>{
            this.updateBuffer(data)
         })
  }

  async initGATTConnection() {
     
        await this.deviceConnect() 
        const gattServer = await this.device.gatt()
        const rxService= await gattServer.getPrimaryService(this.constructor.RX_SERVICE)
        this.rxChar = await rxService.getCharacteristic(this.constructor.NOTIFY_CHAR_UUID)

}



async stopListening(){
  super.stopListening()
  if (this.rxChar) 
    this.rxChar.stopNotifications()
  if (this.device)
    await this.device.disconnect()
}
  
}

module.exports = EctiveBMS;