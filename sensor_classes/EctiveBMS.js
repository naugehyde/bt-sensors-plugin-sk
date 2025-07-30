const BTSensor = require("../BTSensor");

const testData=[
  ["5e 45 39 33 36 30 30 30 30 31 44 46 34 46 46 46 46",
  "34 30 30 44 30 33 30 30 30 46 30 30 36 33 30 30",
  "43 38 30 42 30 30 38 30 30 37 42 34",
  "42 46 30 44 41 43 30 44 42 42 30 44 43 33 30 44",
  "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
  "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
  "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
  "30 41 39 42 00 00 00 00 00 00 00 00"],
  ["5e 35 34 33 37 30 30 30 30 30 30 30 30 30 30 30 30",
   "34 38 45 38 30 31 30 30 31 30 30 30 36 33 30 30",
   "43 30 30 42 30 30 38 30 38 37 46 34",
   "33 41 30 45 30 35 30 45 30 33 30 45 30 46 30 44",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 35 37 44 00 00 00 00 00 00"
  ],
  //bad data (!=0x21)
  ["5e 35 34 33 37 30 30 30 30 30 30 30 30 30 30 30 30", 
   "34 38 45 38 30 21 30 30 31 30 30 30 36 33 30 30", 
   "43 30 30 42 30 30 38 30 38 37 46 34",
   "33 41 30 45 30 35 30 45 30 33 30 45 30 46 30 44",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 35 37 44 00 00 00 00 00 00"
  ]
]

class EctiveBMS extends BTSensor {
  static Domain = BTSensor.SensorDomains.electrical

  static RX_SERVICE = "0000ffe0-0000-1000-8000-00805f9b34fb"  
  static NOTIFY_CHAR_UUID = "0000ffe4-0000-1000-8000-00805f9b34fb"
  static test(data, numCells=4){
    const obj = new EctiveBMS()
    obj.currentProperties={Name:"Topbrand BMS", Address:"<mac>"}
    obj.numberOfCells=numCells
    obj.initSchema()
    obj.debug=(m)=>{console.log(m)}
    for (const [tag,path] of Object.entries(obj._schema.properties.paths.properties)) {
      obj.on(tag, val=>{console.log(`${tag} => ${val} `)})
    }
    data.forEach(d => {
      const _d=d.replaceAll(" ","").toUpperCase()
      const b=Buffer.from(_d,"hex")

      obj.updateBuffer(b)
    });
  }
  static identify(device){
    return null
  }

  _dataBuffer=null
  _dataError = false

  initSchema(){
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
        (buffer)=>{return buffer.readUInt32LE(0) / 1000}

      this.addDefaultPath('current','electrical.batteries.current')
        .read=
        (buffer)=>{return buffer.readInt32LE(4) / 1000} 

       this.addMetadatum(`cycleCharge`, 'C', `cycle charge`,
          (buffer)=>{
            return 3600*(buffer.readUInt32LE(8)/1000)
          })
         .default='electrical.batteries.{batteryID}.cycleCharge'


       this.addMetadatum('cycleCount', '', 'number of cycles',
          (buffer)=>{
            return buffer.readUInt16LE(12)
          })
         .default='electrical.batteries.{batteryID}.cycles'

      this.addDefaultPath('SOC','electrical.batteries.capacity.stateOfCharge')
        .read=(buffer)=>{return buffer.readUInt16LE(14)/100} 
      
        this.addMetadatum('temp', 'K', 'Temperature reading',
          (buffer)=>{
            return buffer.readUInt16LE(16)/10
          })
         .default='electrical.batteries.{batteryID}.temperature'


        this.addMetadatum('flags', '', 'Problem flags',
          (buffer)=>{
            return buffer.readUInt16LE(18).toString('2').padStart(16,'0')
          })
         .default='electrical.batteries.{batteryID}.problemFlags'
      
      
      for (let i=0; i<this?.numberOfCells??4; i++){
        this.addMetadatum(`cell${i+1}Voltage`, 'V', `Cell ${i+1} voltage`,
          (buffer)=>{return buffer.readUInt16LE((22+(i*2)))/1000} )
          .default=`electrical.batteries.{batteryID}.cell${i+1}.voltage`
      }
  }

  hasGATT(){
    return true
  }


usingGATT(){
      return true
}

emitGATT(){
  //do nothing
}

  verifyData(d1,d2){
          if (d1.length!==d2.toString("utf8").length/2) {
            this._dataError=true
            this.debug(`Malformed packet received: ${d2.toString()}`)
          }
          return !this._dataError
  }

  updateBuffer(data){

            if (data[0]==0x5E){ //start of stream
                this._dataBuffer = Buffer.from(data.subarray(1).toString("utf8"),"hex") 
                this.debug(`this._dataBuffer=${this._dataBuffer}`)
                this.verifyData(this._dataBuffer,data.subarray(1))
            } 
            else {
              if (!this._dataError) {
                const zeroIndex = data.indexOf(0x0)
                this.debug(`zeroIndex=${zeroIndex}`)
                const d = zeroIndex==-1?data:data.subarray(0,zeroIndex)
                const _data = Buffer.from(d.toString("utf8"),"hex")
                this.debug(`_data=${_data}`)
                if (this.verifyData(_data,d)) {
                  this._dataBuffer=Buffer.concat([this._dataBuffer, _data])
                  if (zeroIndex>=1) //end of stream
                    this.emitValuesFrom(this._dataBuffer)
                }
              }
            }
    }

  async initGATTNotifications(){
         await this.rxChar.startNotifications()
         this.debug(`Notifications started `)
         this.rxChar.on("valuechanged", (data)=>{
            this.debug(`valuechanged: ${data}`)
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