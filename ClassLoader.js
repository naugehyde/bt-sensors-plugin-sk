const fs = require('fs');
const path = require('path');

function loadSubclasses(dir)
{
    const classMap = new Map()
    const classFiles = fs.readdirSync(dir)
    .filter(file => file.endsWith('.js'));

    classFiles.forEach(file => {
        const filePath = path.join(dir, file);
        const cls = require(filePath);
        classMap.set(cls.name, cls);
    })
    return classMap
}
module.exports = {loadSubclasses}