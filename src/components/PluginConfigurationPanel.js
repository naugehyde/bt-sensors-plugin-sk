import Form from '@rjsf/core' ;
import validator from '@rjsf/validator-ajv8';
import React from "react";
import ReactHtmlParser from 'react-html-parser';

import {useEffect, useState} from 'react'

import {Button, Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { SignalCellular0Bar, SignalCellular1Bar, SignalCellular2Bar, SignalCellular3Bar, SignalCellular4Bar, SignalCellularConnectedNoInternet0Bar    } from '@material-ui/icons';

const log = (type) => console.log.bind(console, type);

import ListGroup from 'react-bootstrap/ListGroup';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

import { ListGroupItem } from 'react-bootstrap';

import ProgressBar from 'react-bootstrap/ProgressBar';

var _sensorMap, _sensorDomains={}, _sensorList={}

export default function BTConfig (props)  {

   const _uiSchema= {
    "ui:options": {label: false},
    'title': { 'ui:widget': 'hidden' }
  }

  const baseUISchema = 
  {
  "ui:field": "LayoutGridField",
  "ui:layoutGrid": {
      "ui:row":[
      {
        "ui:row": {
          "className": "row",
          "children": [
            {
              "ui:columns": {
                "className": "col-xs-4",
                "children": [
                  "adapter",
                  "transport",
                  "duplicateData",
                  "discoveryTimeout",
                  "discoveryInterval"
                ]
              }
            }
          ]
        }
      }
      ]
    }
  }

const useStyles = makeStyles((theme) => ({
  root: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
}));

  const [baseSchema, setBaseSchema] = useState({})

  const [baseData, setBaseData] = useState({})

  const [schema, setSchema] = useState({}) 
  const [ uiSchema, setUISchema] = useState(_uiSchema )
  const [sensorList, setSensorList] = useState([])

  const [sensorData, setSensorData] = useState()
  const [sensorMap, setSensorMap ] = useState(new Map() )
 
  const [progress, setProgress ] = useState({
    "progress":0, "maxTimeout": 100, 
    "deviceCount":0, 
    "totalDevices":0})
  
 
  const [pluginState, setPluginState ] = useState("unknown")
  const [error, setError ] = useState()
  const classes = useStyles();

 
  function sendJSONData(cmd, data){

    console.log(`sending ${cmd}`) 
    console.log(data)
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    return fetch(`/plugins/bt-sensors-plugin-sk/${cmd}`, {
      credentials: 'include',
      method: 'POST',
	    body: JSON.stringify(data),
      headers:headers
    })
  }

  async function fetchJSONData(path){
    console.log(`fetching ${path}`)
    var result
    try {
      result = fetch(`/plugins/bt-sensors-plugin-sk/${path}`, {
        credentials: 'include'
      })
    } catch (e) {
      result=
        {
          status: 500,
          statusText: e.toString()
        }
    }
    return result
  }

  async function getSensors(){
    console.log("getSensors")
    const response = await fetchJSONData("getSensors")
    if (response.status!=200){
      throw new Error(`Unable get sensor data: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    console.log(json)
    //for (let i=0;i<json.length;i++){
    //  json[i].schema.htmlDescription=<div>{ReactHtmlParser(json[i].schema.htmlDescription)}<p></p></div>
    //}
    return json

  }
  async function getDomains(){
    console.log("getDomains")
    const response = await fetchJSONData("getDomains")
    if (response.status!=200){
      throw new Error(`Unable get domain data: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    console.log(json)
    return json

  }
  async function getBaseData(){
    console.log("getBaseData")
    const response = await fetchJSONData("getBaseData")
    if (response.status!=200){
      throw new Error(`Unable to get base data: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    console.log(json)
    json.schema.htmlDescription=<div>{ReactHtmlParser(json.schema.htmlDescription)}<p></p></div>
    return json
  }
  async function getProgress(){
    console.log("getProgress")
    const response = await fetchJSONData("getProgress")
    if (response.status!=200){
      throw new Error(`Unable to get progress: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    console.log(json)
    return json
  }

  function updateSensorData(data){
    console.log("updateSensorData")
    sendJSONData("updateSensorData", data).then((response)=>{ 
      if (response.status != 200) {
        throw new Error(response.statusText)
      }
      sensorMap.get(data.mac_address)._changesMade=false
      sensorMap.get(data.mac_address).config = data
      
    })
  } 

  function undoChanges(mac) {
    console.log("undoChanges")
    sensorMap.get(mac)._changesMade = false
    setSensorData( sensorMap.get(mac).config )
  }

  function removeSensorData(mac){
    console.log("removeSensorData")

    try{ 
    
      sendJSONData("removeSensorData", {mac_address:mac} ).then((response)=>{
        if (response.status != 200) {
            throw new Error(response.statusText)
        }
        })

        _sensorMap.delete(mac)
        
        setSensorMap(new Map(_sensorMap))
        setSchema( {} )
    } catch {(e)=>
      setError( new Error(`Couldn't remove ${mac}: ${e}`))
    }
     
  }


  function updateBaseData(data){
    console.log("updateBaseData")

    sendJSONData("updateBaseData", data).then( (response )=>{
      if (response.status != 200) {
        setError(new Error(`Unable to update base data: ${response.statusText} (${response.status})`))
      } /*else {
        getProgress().then((json)=>{
          setProgress(json)
        }).catch((e)=>{
          setError(e)
        })
      }*/
      })
  }
    

  function refreshSensors(){
    console.log('refreshing sensor map')

    getSensors().then((sensors)=>{
      setSensorMap (new Map(sensors.map((sensor)=>[sensor.info.mac,sensor])));    
    })
    .catch((e)=>{
      setError(e)
    })
  }


  useEffect(()=>{
    console.log("useEffect([])")
    let eventSource=null

    fetchJSONData("getPluginState").then( async (response)=> {
      if (response.status==404) {
        setPluginState("unknown")
        throw new Error("unable to get plugin state")
      }
      const json = await response.json()
      console.log("Setting up eventsource")
      eventSource = new EventSource("/plugins/bt-sensors-plugin-sk/sse", { withCredentials: true })

      setPluginState(json.state)
      
      _sensorDomains = await getDomains()

      eventSource.addEventListener("newsensor", (event) => {
        console.log("newsensor")
        let json = JSON.parse(event.data)
        
        if (!_sensorMap.has(json.info.mac)) {
          console.log(`New sensor: ${json.info.mac}`)
          setSensorMap(new Map(_sensorMap.set(json.info.mac, json)))
        }
      });

      eventSource.addEventListener("sensorchanged", (event) => {
        let json = JSON.parse(event.data)      
        console.log("sensorchanged")
        console.log(json)
        
        if (_sensorMap.has(json.mac)) {      
          let sensor = _sensorMap.get(json.mac)

          Object.assign(sensor.info, json )
          setSensorMap(new Map ( _sensorMap ))
        }
      });
      eventSource.addEventListener("progress", (event) => {
        console.log("progress")
        const json = JSON.parse(event.data)  
        setProgress(json)
        console.log(json)
      });

      eventSource.addEventListener("pluginstate", (event) => {
        console.log("pluginstate")
        const json = JSON.parse(event.data)  
        setPluginState(json.state)
      });
     
    })

    .catch( (e) => { 
        setError(e)
      }
    )
    return () => { 
      console.log("Closing connection to SSE")
      eventSource.close()
    };
 },[])

useEffect(()=>{
  console.log("useEffect([pluginState])")
  if (pluginState=="started"){
    refreshSensors()
    
    getBaseData().then((json) => {
      setBaseSchema(json.schema);    
      setBaseData(json.data);
    }).catch((e)=>{
      setError(e)
    })

    getProgress().then((json)=>{
      setProgress(json)
    }).catch((e)=>{
      setError(e)
    })

  } else{
    setSensorMap(new Map())
    setBaseSchema({})
    setBaseData({})
  }

},[pluginState])



function confirmDelete(mac){
  const result = window.confirm(`Delete configuration for ${mac}?`)
  if (result)
    removeSensorData(mac)
}
 
function signalStrengthIcon(sensor){
  if (sensor.info.lastContactDelta ==null || sensor.info.lastContactDelta > sensor.config.discoveryTimeout) 
    return <SignalCellularConnectedNoInternet0Bar/>  
  
  if (sensor.info.signalStrength > 80)
    return <SignalCellular4Bar/> 

  if (sensor.info.signalStrength > 60)
    return <SignalCellular3Bar/> 

  if (sensor.info.signalStrength > 40)
    return <SignalCellular2Bar/>

  if (sensor.info.signalStrength > 20)
    return <SignalCellular1Bar/>

  return <SignalCellular0Bar/>

}
function hasConfig(sensor){
  return Object.keys(sensor.config).length>0;
}

function createListGroupItem(sensor){

  const config = hasConfig(sensor)
  return <ListGroupItem action 
        onClick={()=>{ 
            sensor.config.mac_address=sensor.info.mac
            setSchema(sensor.schema)
            setSensorData(sensor.config)
        }
        }> 
        <div  class="d-flex justify-content-between align-items-center" style={config?{fontWeight:"normal"}:{fontStyle:"italic"}}>
        {`${sensor._changesMade?"*":""}${sensor.info.name} MAC: ${sensor.info.mac} RSSI: ${ifNullNaN(sensor.info.RSSI)}`  }
        <div class="d-flex justify-content-between ">
          {
            signalStrengthIcon(sensor)
          }
        </div>
        </div>
        </ListGroupItem>
}

function configuredDevices(){
  return Array.from(sensorMap.entries()).filter((entry)=>hasConfig(entry[1]))
}

function devicesInDomain(domain){
  if (domain==="_configured")
    return configuredDevices()
  else
  return Array.from(sensorMap.entries()).filter((entry)=>entry[1].info.domain===domain)
}


useEffect(()=>{
  console.log("useEffect([sensorMap])")

    _sensorMap = sensorMap
    
    const _sensorDomains = [... (new Set(sensorMap.entries().map((entry)=>{ return entry[1].info.domain})))].sort()
    const sl = {
      _configured: configuredDevices().length==0?
        "Select a device from its domain tab (Electrical etc.) and configure it.":
        configuredDevices().map((entry) =>  {
         return createListGroupItem(sensorMap.get(entry[0]))
      })
      } 

      _sensorDomains.forEach((d)=>{
        sl[d]=devicesInDomain(d).map((entry) =>  {
        return createListGroupItem(sensorMap.get(entry[0]))
       })
    })
    _sensorList=sl 
    
    
  },[sensorMap]
  )

  function ifNullNaN(value){
    return value==null? NaN : value
  }

  function getSensorList(domain){
    return _sensorList[domain]
  }

  function getTabs(){
    
    return Object.keys(_sensorList).map((domain)=> {return getTab(domain)})
  }
    // <div style={{paddingBottom: 20}} class="d-flex flex-wrap justify-content-start align-items-start">
    //    <div class="d-flex flex-column" >

  function getTab(key){
    var title = key.slice(key.charAt(0)==="_"?1:0)
    let sl = getSensorList(key)
    
    return <Tab eventKey={key} title={`${title.charAt(0).toUpperCase()}${title.slice(1)}${devicesInDomain(key).length==0?'':' ('+devicesInDomain(key).length+')'}` }  >
        
    <ListGroup style={{  maxHeight: '300px', overflowY: 'auto' }}>
      {sl}
    </ListGroup>
    

    </Tab>
  }

 
  function openInNewTab (url)  {
    window.open(url, "_blank", "noreferrer");
  }

  function CustomFieldTemplate(props) {
  const { id, classNames, style, label, help, required, description, errors, children } = props;
  return (
    <div className={classNames} style={style}>
      <Grid container xs={12} direction="row" spacing="1">
        <Grid item xs={1} sm container direction="column">
        <Grid item ><label htmlFor={id}>{label}{required ? '*' : null}</label></Grid>
        <Grid item> {description}</Grid>
        </Grid>
        <Grid item>{children}</Grid>
      </Grid>
      {errors}
      {help}
    </div>
  );
}

  if (pluginState=="stopped" || pluginState=="unknown")
    return (<h3>Enable plugin to see configuration</h3>)
  else
  return(

    <div>
       <div className={classes.root}>
          
          <Button  variant="contained" onClick={()=>{openInNewTab("https://github.com/naugehyde/bt-sensors-plugin-sk/tree/1.2.0-beta#configuration")}}>Documentation</Button>
          <Button variant="contained"  onClick={()=>{openInNewTab("https://github.com/naugehyde/bt-sensors-plugin-sk/issues/new/choose")}}>Report Issue</Button>
          <Button variant="contained"  onClick={()=>{openInNewTab("https://discord.com/channels/1170433917761892493/1295425963466952725" )}}>Discord Thread</Button>
          <p></p>
          <p></p>
      </div>
      <hr style={{"width":"100%","height":"1px","color":"gray","background-color":"gray","text-align":"left","margin-left":0}}></hr>

      {error?<h2 style="color: red;">{error}</h2>:""}
      <Form 
        schema={baseSchema}
        validator={validator}
        uiSchema={baseUISchema}
        onChange={(e) => setBaseData(e.formData)}
        onSubmit={ ({ formData }, e) => { updateBaseData(formData); setSchema({}) } }

        onError={log('errors')}
        formData={baseData}
      />
    <hr style={{"width":"100%","height":"1px","color":"gray","background-color":"gray","text-align":"left","margin-left":0}}></hr>
      <p></p>
      <p></p>
      { (progress.deviceCount<progress.totalDevices)?
        <ProgressBar max={progress.maxTimeout} 
                     now={progress.progress} 
        />:""
      }
      <p></p>
      <Tabs
      defaultActiveKey="_configured"
      id="domain-tabs"
      className="mb-3"
      onClick={()=>{setSchema({})}}
      >
      {getTabs()}
      </Tabs>
      <div style= {{ paddingLeft: 10, paddingTop: 10, display: (Object.keys(schema).length==0)? "none" :""  }}>
      <Grid container direction="column" style={{spacing:5}}>
      <Grid item><h2>{schema?.title}</h2><p></p></Grid>
      <Grid item>{ReactHtmlParser(schema?.htmlDescription)}</Grid>
      </Grid>
    
    <Form
      schema={schema}
      validator={validator}
      uiSchema={uiSchema}
      onChange={(e) => {
          const s = sensorMap.get(e.formData.mac_address)
          s._changesMade=true
          setSensorData(e.formData)
        }
      }
      onSubmit={({ formData }, e) => {
        updateSensorData(formData)
        setSchema({})
        alert("Changes saved")
      }}
      onError={log('errors')}
      formData={sensorData}>
      <div className={classes.root}>
        <Button type='submit' color="primary" variant="contained">Save</Button>
        <Button variant="contained" onClick={()=>{undoChanges(sensorData.mac_address)}}>Undo</Button>
        <Button variant="contained" color="secondary" onClick={(e)=>confirmDelete(sensorData.mac_address)}>Delete</Button>
      </div>  
    </Form>

   
    </div>
    </div>
  )
    

  }