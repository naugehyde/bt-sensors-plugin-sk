const BTSensor = require("../BTSensor");
function sumByteArray(byteArray) {
 let sum = 0;
    for (let i = 0; i < byteArray.length; i++) {
     sum += byteArray[i];
   }
   return sum;
 }

function checkSum(buffer){
  if (buffer.length<5) {
    console.log (`Can't checksum ${buffer}. Invalid buffer. Buffer must be at least 5 bytes long.`)
    return false
  }
  const checksum = buffer.readUInt16BE(buffer.length-3)
  let sum = sumByteArray(Uint8Array.prototype.slice.call(buffer, 2, buffer.length-3))
  if ((0xffff-sum)+1 == checksum) return true
  sum = sumByteArray(Uint8Array.prototype.slice.call(buffer, 2, buffer.length-2))
  return (0xffff-sum)+1 == checksum 
}

class JBDBMS extends BTSensor {
      static Domain = BTSensor.SensorDomains.electrical

  static TX_RX_SERVICE = "0000ff00-0000-1000-8000-00805f9b34fb"  
  static NOTIFY_CHAR_UUID = "0000ff01-0000-1000-8000-00805f9b34fb"
  static WRITE_CHAR_UUID  = "0000ff02-0000-1000-8000-00805f9b34fb"
  
  static identify(device){
    return null
  }
  static ImageFile = "JBDBMS.webp"

  jbdCommand(command) {
    return [0xDD, 0xA5, command, 0x00, 0xFF, 0xFF - (command - 1), 0x77]
  }

  async sendReadFunctionRequest( command ){    
    this.debug( `sending ${command}`)
    return await this.txChar.writeValueWithoutResponse(Buffer.from(this.jbdCommand(command)))
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
        (buffer)=>{
          const bits = buffer.readUInt16BE(20).toString(2)
          return {    
		        singleCellOvervolt: bits[0]=='1',
		        singleCellUndervolt: bits[1]=='1',
		        packOvervolt: (bits[2]=='1'),
		        packUndervolt: bits[3]=='1',
		        chargeOvertemp:bits[4]=='1',
		        chargeUndertemp:bits[5]=='1',
		        dischargeOvertemp:bits[6]=='1',
		        dischargeUndertemp:bits[7]=='1',
		        chargeOvercurrent:bits[8]=='1',
		        dischargeOvercurrent:bits[9]=='1',
		        shortCircut:bits[10]=='1',
		        frontEndDetectionICError:bits[11]=='1',
		        softwareLockMOS:bits[12]=='1',
          }  
        })
        .default="electrical.batteries.{batteryID}.protectionStatus"
         
      this.addDefaultPath('SOC','electrical.batteries.capacity.stateOfCharge')
        .read=(buffer)=>{return buffer.readUInt8(23)/100} 


      this.addMetadatum('FET', '', 'FET On/Off Status',
          (buffer)=>{return buffer.readUInt8(24) !=0 } )
          .default="electrical.batteries.{batteryID}.FETStatus"
  
      this.addMetadatum('FETCharging', '', 'FET Status Charging',
          (buffer)=>{return (buffer.readUInt8(24) & 0x1) !=0  })
          .default="electrical.batteries.{batteryID}.FETStatus.charging"

      this.addMetadatum('FETDischarging', '', 'FET Status Discharging',
          (buffer)=>{return (buffer.readUInt8(24) & 0x2) !=0 })
          .default="electrical.batteries.{batteryID}.FETStatus.discharging"
  
        await this.deviceConnect() 
        const gattServer = await this.device.gatt()
        const txRxService= await gattServer.getPrimaryService(this.constructor.TX_RX_SERVICE)
        this.rxChar = await txRxService.getCharacteristic(this.constructor.NOTIFY_CHAR_UUID)
        this.txChar = await txRxService.getCharacteristic(this.constructor.WRITE_CHAR_UUID)
        await this.rxChar.startNotifications()
 
        const cellsAndTemps = await this.getNumberOfCellsAndTemps()
        this.numberOfCells=cellsAndTemps.cells
        this.numberOfTemps=cellsAndTemps.temps

      for (let i=0; i<this.numberOfTemps; i++){
        this.addMetadatum(`temp${i}`, 'K', `Temperature${i+1} reading`,
          (buffer)=>{
            return buffer.readUInt16BE(27+(i*2))/10
          })
         .default=`electrical.batteries.{batteryID}.Temperature${i+1}`
      }
      
      for (let i=0; i<this.numberOfCells; i++){
        this.addMetadatum(`cell${i}Voltage`, 'V', `Cell ${i+1} voltage`,
          (buffer)=>{return buffer.readUInt16BE((4+(i*2)))/1000} )
          .default=`electrical.batteries.{batteryID}.cell${i}.voltage`
        this.addMetadatum(`cell${i}Balance`, '', `Cell ${i+1} balance` )
          .default=`electrical.batteries.{batteryID}.cell${i}.balance`
        
      }
  }

  hasGATT(){
    return true
  }
  usingGATT(){
    return true
  }
  async initGATTNotifications(){
    this.intervalID = setInterval( async ()=>{
        await this.emitGATT()
    }, 1000*(this?.pollFreq??60) )
  }

  async emitGATT(){
    try {
      await this.getAndEmitBatteryInfo()
    }
    catch (e) {
      this.debug(`Failed to emit battery info for ${this.getName()}: ${e}`)
    }
    setTimeout(async ()=>{
      try {await this.getAndEmitCellVoltages()} 
      catch (e) {
        this.debug(`Failed to emit Cell Voltages for ${this.getName()}: ${e}`)
      }
    }, 10000)
}

  async getNumberOfCellsAndTemps(){
    const b = await this.getBuffer(0x3)
    return {cells:b[25], temps:b[26]}
  }  


  getBuffer (command){

    return new Promise( async ( resolve, reject )=>{
        const r = await this.sendReadFunctionRequest(command)
        let result = Buffer.alloc(256)
        let offset = 0
        let datasize = -1
        const timer = setTimeout(() => {
          clearTimeout(timer)
          reject(new Error(`Response timed out (+30s) from JBDBMS device ${this.getName()}. `));
        }, 30000);

        const valChanged = async (buffer) => {
          if (offset==0){ //first packet
            if (buffer[0]!==0xDD || buffer.length < 5 || buffer[1] !== command)
                reject(`Invalid buffer from ${this.getName()}, not processing.`)
            else 
                datasize=buffer[3]
          }
          buffer.copy(result,offset)
          if (buffer[buffer.length-1]==0x77 && offset+buffer.length-7==datasize){
            
            result = Uint8Array.prototype.slice.call(result, 0, offset+buffer.length)
            this.rxChar.removeAllListeners()
            clearTimeout(timer)
            if (!checkSum(result)) 
                reject(`Invalid checksum from ${this.getName()}, not processing.`)
            
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
    return this.getBuffer(0x03).then((buffer)=>{
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

async getAndEmitCellVoltages(){
  return this.getBuffer(0x4).then((buffer)=>{

  for (let i=0; i<this.numberOfCells; i++){
      this.emitData(`cell${i}Voltage`,buffer)
  }})
}

async initGATTInterval(){
   
  await this.emitGATT()
  await this.initGATTNotifications()
}

async deactivateGATT(){
  await this.stopGATTNotifications(this.rxChar)
  await super.deactivateGATT()
}
  
}

module.exports = JBDBMS;