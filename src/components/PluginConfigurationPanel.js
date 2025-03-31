import Form from '@rjsf/core' ;
import { getWidget } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import {render} from 'react-dom';
import React from 'react'
import {useEffect, useState} from 'react'
import {default as BS} from 'react-bootstrap/Form';

const log = (type) => console.log.bind(console, type);

export default (props) => {


  const [schema, setSchema] = useState({})
  const [formData, setFormData] = useState({})
  const [ deviceMap, setDeviceMap ] = useState(new Map())

  useEffect(()=>{
    fetch('/plugins/bt-sensors-plugin-sk/devices', {
      credentials: 'include'
    }).then(async (response) => {
      if (response.status != 200) {
        throw new Error(response.status)
      }  
     
      const json = await response.json()
      const m = new Map(json.map((device)=>[device.sensor.mac,device]))
      setDeviceMap(m);
    
    }).then(()=>{
      const eventSource = new EventSource("/plugins/bt-sensors-plugin-sk/sse")
      eventSource.addEventListener("newsensor", (event) => {
      let json = JSON.parse(event.data)
      if (!deviceMap.has(json.sensor.mac)) {
        deviceMap.set(json.sensor.mac, json)

        setDeviceMap(new Map (Array.from(deviceMap.entries())))

      }
      console.log(`${event.type} | ${event.data}`);
    });
    }
    )
    .catch(err => {
      window.alert('Could not get bluetooth schema:' + err)
    }) 
    return () => eventSource.close();

},[])
 
  const form =  <Form
  schema={schema}
  validator={validator}
  onChange={ log('changed') }
  onSubmit={log('submitted')}
  onError={log('errors')}
  formData={formData}
/>


  return(
    <div>
      <select
        onChange = {(e)=>
          {
            setSchema(deviceMap.get(e.target.value).schema)
            setFormData(deviceMap.get(e.target.value).config)
          }
        }>
      {Array.from(deviceMap.entries()).map((entry) =>  
        <option key={entry[0]} value={entry[0]}> 
          {entry[1].sensor.name}
        </option>         
      )
      }
      </select>
      {form}
    </div>
  )
    
}
