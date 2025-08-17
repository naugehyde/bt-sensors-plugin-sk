const fs = require('fs')
const path = require('path')
const semver = require('semver')

     function loadClasses (dir, ext='.js')
        {
            const classMap = new Map()
            const classFiles = fs.readdirSync(dir)
            .filter(file => file.endsWith(ext));
        
            classFiles.forEach( (file) => {
                const filePath = path.join(dir, file);
                const cls = require (filePath)
                classMap.set(cls.name, cls);
            })
            return classMap
        }

       function loadClassMap(app) {
        const _classMap =  loadClasses(path.join(__dirname, 'sensor_classes'))
        const classMap = new Map([..._classMap].filter(([k, v]) => !k.startsWith("_") ))
        const libPath = app.config.appPath +(
            semver.gt(app.config.version,"2.13.5")?"dist":"lib"
        )
        import(libPath+"/modules.js").then( (modulesjs)=>{
        const { default:defaultExport} = modulesjs
            const modules = defaultExport.modulesWithKeyword(app.config, "signalk-bt-sensor-class")
            modules.forEach((module)=>{
                module.metadata.classFiles.forEach(  (classFile)=>{
                    try{
                        const cls = require(module.location+module.module+"/"+classFile);
                        classMap.set(cls.name, cls);
                    } catch (e) {
                        console.log(`Unable to load class (${cls.name}): ${e.message}`)
                        console.log(e)
                    }
                })
            })
            classMap.get('UNKNOWN').classMap=new Map([...classMap].sort().filter(([k, v]) => !v.isSystem )) // share the classMap with Unknown for configuration purposes
        })
        return classMap
    }
    module.exports=loadClassMap