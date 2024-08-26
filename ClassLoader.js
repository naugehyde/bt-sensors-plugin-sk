const fs = require('fs');
const path = require('path');

/**
 * Load the .js classes in a given directory and return a map of classes
 * @param {string} dir - the directory from which to load classes
 * @param {string} [ext='.js'] - optional file extension
 * @returns {Map} - Map of class names to classes 
 */

function loadSubclasses(dir, ext='.js')
{
    const classMap = new Map()
    const classFiles = fs.readdirSync(dir)
    .filter(file => file.endsWith(ext));

    classFiles.forEach(file => {
        const filePath = path.join(dir, file);
        const cls = require(filePath);
        classMap.set(cls.name, cls);
    })
    return classMap
}
module.exports = {loadSubclasses}