const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const exec = require('child_process').exec;
const SEP_INIT = '☻';
const SEP_END = '♥';
const NL = '\n\n';
const SEP_PATH = '\\';


const newTxt = (name, content, path) => {
    return new Promise((rs, rj) => {
        fs.writeFile(path + SEP_PATH + name, content, (err) => {
            if (err) rj(err);
            console.log('txt saved!');
            rs(true);
        });
    })
}

const newLine = (name, content, path) => {
    fs.appendFile(path + SEP_PATH + name, buildNewLine(content), (err) => {
        if (err) {
            newTxt(name, buildNewLine(content), path);
            console.log('txt creado');
        }
        else {
            console.log('linea añadida');
        }
    });
}

const readFile = (name, path) => {
    return new Promise((rs) => {
        fs.readFile(path + SEP_PATH + name, 'utf8', (err, data) => {
            if (err) {
                console.error(err);
            } else {
                const arrSt = data.split(SEP_END)
                let arrRes = [];
                for (let i of arrSt) {
                    arrRes.push({ date: i.split(SEP_INIT)[1], value: i.split(SEP_INIT)[2] })
                }
                rs(arrRes)
            }
        });
    })
}

const buildNewLine = (st) => {
    const date = format(new Date(), 'yyyy/MM/dd HH:mm:ss');
    let line = SEP_INIT + date + SEP_INIT + st + SEP_END + NL;
    return line;
}

const buildTxt = (newLines, element, PATH, name) => {
    return new Promise((rs, rj) => {
        if (element) {
            element.date = format(new Date(), 'yyyy/MM/dd HH:mm:ss');
            newLines.push(element);
        }
        let stLines = '';
        for (const el of newLines) {
            if (el.date) {
                stLines += SEP_INIT + el.date + SEP_INIT + el.value + SEP_END + NL;
            }
        }
        console.log(stLines);
        newTxt(name, stLines, PATH).then(value => {
            rs(value);
        }).catch(err => {
            rj(err);
        });
    });
}


const getFileNames = (PATH) => {
    return new Promise((rs, rj) => {
        fs.readdir(PATH, (err, files) => {
            if (err) {
                fs.mkdir(PATH, {}, (err) => {
                    if (err) {
                        console.error(err);
                    }
                })
            }
            if (files && files.length) {
                const txts = files.filter(filename =>  path.extname(filename) === '.txt');
                rs(txts);
            } else {
                rs([]);
            }
        });
    })
}

const writeConfig = (dialog, json, key, PATH, jsonPath) => {
    return new Promise((rs, rj) => {
        dialog.showOpenDialog({ properties: ['openDirectory'], defaultPath: PATH, title: 'Selecciona la carpeta donde se guardaran las copias del historial' }).then((response) => {
            if (!response.canceled) {
                json[key] = response.filePaths[0];
                fs.writeFile(jsonPath, JSON.stringify(json), (err) => {
                    if (err) throw err;
                    console.log('config.json modificado');
                    rs(response.filePaths[0]);
                });
            } else {
                console.log("no file selected");
                rs(null);
            }
        });
    })
}


const newFile = (dialog, PATH) => {
    return new Promise((rs, rj) => {
        dialog.showSaveDialog({ defaultPath: PATH, title: 'Nuevo archivo', filters: [{ extensions: ['txt'] }] }).then((response) => {
            if (!response.canceled) {
                let name =  path.basename(response.filePath);
                if (! path.extname(name)) {
                    name += '.txt';
                }
                newTxt(name, '', PATH).then(res => {
                    rs(res);
                }).catch(err => {
                    rj(err);
                })
            } else {
                console.log("no file selected");
                rs(null);
            }
        });
    })

}



const saveShortcut = (json, key, values, jsonPath) => {
    return new Promise((rs, rj) => {
        if (values.length) {
            const keycodes = []
            const stcodes = []
            for (const i of values) {
                keycodes.push(i.keycode)
                stcodes.push(i.st)
            }
            json[key] = keycodes;
            json['stkeys'] = stcodes;
            fs.writeFile(jsonPath, JSON.stringify(json), (err) => {
                if (err) throw err;
                console.log('config.json modificado');
                rs({ keycodes: keycodes, keys: stcodes });
            });
        } else {
            console.log("no file selected");
            rs(null);
        }
    })
}

const saveQuickFolder = (dialog, json, key, value, jsonPath) => {
    return new Promise((rs, rj) => {
        dialog.showOpenDialog({ properties: ['openDirectory'], title: 'Selecciona la carpeta de "acceso rápido"' }).then((response) => {
            if (!response.canceled) {
                json[key] = response.filePaths[0];
                fs.writeFile(jsonPath, JSON.stringify(json), (err) => {
                    if (err) throw err;
                    console.log('config.json modificado');
                    rs({ quick_folder: json[key] });
                });
            } else {
                console.log("no file selected");
                rs(null);
            }
        });
    })
}

const createTask = (window, dialog, json, jsonPath) => {
    return new Promise((rs, rj) => {
        dialog.showMessageBox(window,
            {
                type: 'question',
                title: '  Abrir al iniciar sesión',
                message: '¿Quieres ejecutar automáticamente la aplicación al iniciar sesión en Windows.\nEsta tarea no se guardará si la aplicación no se está ejecutando como Administrador',
                buttons: ['cancelar', 'aceptar'],
                defaultId: 1,
                cancelId: 0
            }
        ).then(val => {
            if (val.response === 1) {
                exec(json.SchtasksDelete, (error, stdout, stderr) => {
                    exec(json.Schtasks, (error, stdout, stderr) => {
                        if (error) {
                            dialog.showMessageBox(window,
                                {
                                    type: 'error',
                                    title: 'Error',
                                    message: error.message
                                });
                        }
                        if (stdout) {
                            json.createdTaskOk = true;
                            fs.writeFile(jsonPath, JSON.stringify(json), (err) => {
                                if (err) throw err;
                                console.log('config.json modificado');
                            });
                            rs(true)
                        }
                        if (stderr) {
                        }
                    });
                });
            }
        })
    })
}



module.exports =
{
    newTxt,
    newLine,
    readFile,
    buildTxt,
    buildNewLine,
    getFileNames,
    writeConfig,
    newFile,
    saveShortcut,
    createTask,
    saveQuickFolder

}