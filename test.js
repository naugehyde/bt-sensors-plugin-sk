const {createBluetooth} = require('node-ble')
const {bluetooth, destroy} = createBluetooth()
const { argv } = require('node:process');


async function main(){

  const adapter = await bluetooth.defaultAdapter()
  
  try{await adapter.startDiscovery()} catch{}
  const device = await adapter.waitDevice(argv[2])
  var trials=0
  await device.connect()
  const gatt = await device.gatt()
  await device.disconnect()

  async function search(){
      await device.connect()

      console.log(`GATT trial #${++trials}...`)
      const s = await gatt.getPrimaryService("65970000-4bda-4c1e-af4b-551c4cf74769")
      const c = await s.getCharacteristic('6597ffff-4bda-4c1e-af4b-551c4cf74769')
      await c.readValue()
      await device.disconnect()
 }

setInterval(() => {
  search()
},argv[3]);
search()
}
main()
