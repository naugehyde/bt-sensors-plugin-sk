const { delimiter } = require("node:path");
const BTSensor = require("../BTSensor");
const EventEmitter = require('node:events');


const testData=[
  ['5e 43',
  '34',                                                        
  '33 33 30 30 30 30 44 32 46 37 46 46 46 46 34 38',
  '45 38 30 31 30 30 30 45 30 30 34 41',              
  '30 30 39 30 30 42 30 30 38 30 30 37 42 34 45 44',  
  '30 43 46 30 30 43 46 32 30 43 46 35 30 43 30 30', 
  '30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30',  
  '30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30',
  '30 30 30 30 30 30 30 30 30 30 30 30',                  
  '30 30 30 43 31 31 00 00 00 00 00 00 00 00'],
  ["5e 35 34 33 37 30 30 30 30 30 30 30 30 30 30 30 30",
   "34 38 45 38 30 31 30 30 31 30 30 30 36 33 30 30",
   "43 30 30 42 30 30 38 30 38 37 46 34",
   "33 41 30 45 30 35 30 45 30 33 30 45 30 46 30 44",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 35 37 44 00 00 00 00 00 00 00 00"
  ],
  //bad data (!=0x21)
  ["5e 35 34 33 37 30 30 30 30 30 30 30 30 30 30 30 30", 
   "34 38 45 38 30 21 30 30 31 30 30 30 36 33 30 30", 
   "43 30 30 42 30 30 38 30 38 37 46 34",
   "33 41 30 45 30 35 30 45 30 33 30 45 30 46 30 44",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 30 30 30 30 30 30 30 30 30 30 30 30 30 30 30",
   "30 35 37 44 00 00 00 00 00 00 00 00"
  ]
]
class EctiveDataManager extends EventEmitter{
  static expectedLength = 120
  static ImageFile = "TopbandBattery.webp"
  buffer = Buffer.from([])
  
  delimitedAt(data){
    const delimiters = [0x5e,0xaf] 
    for (const d of delimiters){
      if (data.includes(d)) return data.indexOf(d)
    }
    return -1
  }

  add(buff) {
      
      const delimiterIndex = this.delimitedAt(buff)
      if (delimiterIndex == 0)
        this.buffer= buff.subarray(1)
      else {
        if (delimiterIndex==-1)
          this.buffer=Buffer.concat([this.buffer, buff])
        else {
          this.buffer=Buffer.concat([this.buffer,buff.subarray(0, delimiterIndex)])
        }
      }
      if ( this.buffer.length==this.constructor.expectedLength) {
        const _data = new EctiveData (this.buffer)
        if (_data.error) {
          this.buffer=Buffer.from([])
          throw new Error (`malformed packet: ${JSON.parse(JSON.stringify(_data)).ascii}`)
        }
        else {
          this.emit("valuechanged", _data.hex )
          this.buffer=Buffer.from([])
        }
      } else {
        if (delimiterIndex>0) {
          this.buffer=buff.subarray(delimiterIndex+1)
        }
      }

  
    }
}

class EctiveData{
  constructor(data){
    this.ascii = data.toString("utf8").slice(0,data.indexOf(0)) 
    this.hex = Buffer.from(this.ascii,"hex")
    this.error = !this.verify()
  }
  
  verify(){
    return (this.hex.length==this.ascii.toString("utf8").length/2) 
  }
}
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
      obj._dataManager.on("valuechanged", (b)=>{
        obj.emitValuesFrom(b)
      })
      data.forEach(d => {
      const _d=d.replaceAll(" ","").toLowerCase()
      const b=Buffer.from(_d,"hex")
      try {
        obj._dataManager.add(b)
      } catch (e){
        obj.debug(`(${obj.getName()}): ${e.message}`)
      }
    });
  }
  static testStream(filename, numCells=4){
    const obj = new EctiveBMS()
    obj.currentProperties={Name:"Topbrand BMS", Address:"<mac>"}
    obj.numberOfCells=numCells
    obj.initSchema()
    obj.debug=(m)=>{console.log(m)}
    for (const [tag,path] of Object.entries(obj._schema.properties.paths.properties)) {
      obj.on(tag, val=>{console.log(`${tag} => ${val} `)})
    }
      obj._dataManager.on("valuechanged", (b)=>{
        obj.emitValuesFrom(b)
      })
      const lineReader = require('readline').createInterface({  input: require('fs').createReadStream(filename)});
    // Each line in input.txt will be successively available here as `line`.
  
    (async ()=>{for await (const line of lineReader) {
      const _d = line.slice(0,50).replaceAll(" ","").toLowerCase()
      const b=Buffer.from(_d,"hex")
      try {
        obj._dataManager.add(b)
      } catch (e){
        obj.debug(`(${obj.getName()}): ${e.message}`)
      }
    }})()
  }
    
  static DisplayName(){
    return "EctiveBMS: Topbrand, Skanbatt and other LiFePo4 batteries"
  }
  static identify(device){
    return null
  }

  _dataManager = new EctiveDataManager()
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
            this.debug(`(${this.getName()}) malformed packet received: ${d2.toString()}`)
          }
          return !this._dataError
  }


  async initGATTNotifications(){
         await this.rxChar.startNotifications()
         this.debug(`(${this.getName()}) Notifications started`)

         this.rxChar.on("valuechanged", (buffer)=>{
            try {
              this._dataManager.add(buffer)
            } catch (e){
              this.debug(`(${this.getName()}): ${e.message}`)
            }
         })
        this._dataManager.on("valuechanged", (b)=>{
          this.emitValuesFrom(b)
        } )
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