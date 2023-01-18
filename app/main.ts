import * as elec from 'electron';
const clipboard = require('copy-paste');
const ks = require('node-key-sender');
const p = require('path');
const os = require('os');
const iohook = require('./services/iohook-manager.ts');
const file = require('./services/file.ts');
const jsonConfig = require(`${__dirname}/app-config.json`);
// const package = require(`${__dirname}/package.json`);
const socket = require('./services/socket-module.ts');
const speaker = require('win-audio').speaker;
const DAFAULT_FILE = 'main.txt';
// { app, BrowserWindow, elec.ipcMain, elec.dialog, Menu, nativeImage, Tray, Notification, shell }

const mapKeys = [/* 
  { key: 2, replace: 'shift-exclamation_mark' },    // !
  { key: 3, replace: 'shift-quotedbl' },            // "
  { key: 4, replace: 'shift-number_sign' },         // #
  { key: 5, replace: 'shift-dollar' },              // $
  { key: 7, replace: 'shift-ampersand' },           // &
  { key: 8, replace: 'slash' },                     // /
  { key: 9, replace: 'shift-left_parenthesis' },    // (
  { key: 10, replace: 'shift-right_parenthesis' },  // )
  { key: 43, replace: 'back_slash' },               // \
  { key: 40, replace: 'shift-braceleft' },          // {
  { key: 53, replace: 'shift-braceright' },         // }
  { key: 39, replace: 'open_bracket' },             // [
  { key: 13, replace: 'close_bracket' },            // ]
  { key: 54, replace: 'semicolon' },                // ; 
  { key: 11, replace: 'semicolon' }                 // =
  */
]


let shortcut = jsonConfig.shortcut;
let quick_folder = jsonConfig.quick_folder;
let stkeys = jsonConfig.stkeys;
let PATH = jsonConfig.path;
let selectedFile = DAFAULT_FILE;
let appNotificacion
let noCloseWindow

// nombre de la app para la notificacion
elec.app.setAppUserModelId(elec.app.name);
//************************** bandeja del SO  *********************/
let tray
elec.app.whenReady().then(() => {
  // const icon = nativeImage.createFromPath('./logo_letras.png') // en producción no se muesta la imagen
  const icon = elec.nativeImage.createFromPath(p.resolve(__dirname, './logo_letras.png'));
  tray = new elec.Tray(icon)
  // click icono bandeja
  tray.addListener('click', () => {
    if (window && window.isMinimized()) {
      window.restore();
      window.center();
    }
  })
  // boton derecho bandeja (Salir)
  tray.setContextMenu(elec.Menu.buildFromTemplate([
    {
      label: 'Salir', click: () => {
       // elec.app.isQuiting = true;
        if (window && !window.isMinimized()) {
          window.minimize();
        }
        closeNotification();
        iohook.stopShortcuts();
/*         delete iohook;
        delete file;
        delete midi;
        delete socket; */
        window.destroy();
        elec.app.quit();
      }
    }
  ]))
  // etiquetas
  tray.setToolTip('gestor del portapapeles')
  tray.setTitle('Parrino')
})


let window;
const createWindow = () => {
  window = new elec.BrowserWindow({
    height: 500,
    width: 565,
    closable: false,
    minimizable: false,
    maximizable: false,
    frame: true,
    show: false,
    resizable: false,
    backgroundColor: '#000',
    icon: p.resolve(__dirname, './Background.ico'),
    darkTheme: true,
    skipTaskbar: true,
    titleBarStyle: 'hiddenInset',
    // title: package.title + ' ' + package.version,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
     // enableRemoteModule: true
    }
  })
  //  window.webContents.openDevTools();
  window.setThumbarButtons([])
  window.setMenu(null);
  // window.setTitle(package.title + ' ' + package.version);

  window.loadURL(`${__dirname}/dist/index.html`);

  //*************** eventos electron window *******************/

  window.on('ready-to-show', () => {
    initPath(PATH);
    appNotificacion = new Notification('titulo...', { icon: elec.nativeImage.createFromPath(p.resolve(__dirname, './logo_letras.png')) + '' }); //TODO
    iohook.init(window, PATH, shortcut, replaceFunction, mapKeys);
    window.setAlwaysOnTop(true, 'floating');
    socket.init((key, value) => processSocketMsg(key, value));
    console.log('netwoks -> ' + jsonConfig.stringify(getLocalNetworks(), null, 4));
  });

  window.on('blur', () => {
    setTimeout(() => {
      if (window && !window.isMinimized() && !noCloseWindow) {
        iohook.startShortcuts(shortcut);
        window.webContents.send('minimize-window', []);
        window.minimize();
      }
    }, 100);
  });

  window.on('close', (event) => {
   // if (!elec.app.isQuiting) {
      closeNotification();
      event.preventDefault();
      window.quit();
      event.returnValue = false;
   // }
  });

  window.on('closed', () => {
    window = null
  });

  // programacion de tarea
  if (!jsonConfig.createdTaskOk) {
    file.createTask(window, elec.dialog, jsonConfig, jsonConfig).then(() => {
      //seleccionar carpeta
      window.setAlwaysOnTop(false);
      file.writeConfig(elec.dialog, jsonConfig, 'path', PATH, jsonConfig).then(value => {
        if (value) {
          PATH = value;
          initPath(value);
          iohook.init(window, value, shortcut, replaceFunction, mapKeys);
          window.setAlwaysOnTop(true, 'floating');
        }

        elec.dialog.showMessageBox(window,
          {
            type: 'info',
            title: '  Info',
            message: `Se creó correctamente la tarea programada "historial_clipboard".\nSe cerrará la aplicación para que los cambios surtan efecto`
          }).then(val => {
            iohook.stopShortcuts();
/*             delete iohook;
            delete file;
            delete midi;
            delete socket; */
            window.destroy();
            elec.app.quit();
          });
      });
    });
  }

}

//********************************* keySender *************************************/

const replaceFunction = (keyReplace) => {
  console.log(keyReplace);
 // robot.typeString(keyReplace);
}

//***************************** lanzar notificación *******************************/
const showNotification = (title, body) => {
  if (appNotificacion) {
    closeNotification();
    appNotificacion.title = title;
    appNotificacion.body = body;
    appNotificacion.show();
  }

}

const closeNotification = () => {
  if (appNotificacion) {
    appNotificacion.close();
  }
}

/********************************** eventos app *************************************/

elec.app.on('ready', createWindow);

elec.app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    elec.app.quit();
  }
});

/********************************** eventos vista *************************************/
elec.ipcMain.on('on-click-line', (event, arg) => {
  clipboard.copy(arg.value);
  window.minimize();
  ks.sendCombination(['control', 'v']);
})

elec.ipcMain.on('on-R-click-line', (event, arg) => {
  const filesToCopy = [];
  const filesToMove = [];
  file.getFileNames(PATH).then(res => {
    res = res.filter(element => element !== selectedFile);
    for (const i of res) {
      filesToCopy.push({ label: i, click: () => { copyToFile(i, arg) } });
      filesToMove.push({ label: i, click: () => { moveLineToFile(selectedFile, i, arg) } });

    }
    elec.Menu.buildFromTemplate([
      { label: 'Borrar elemento', click: () => { deleteLine(selectedFile, arg) } },
      { label: 'Traduccir', click: () => { launchWebTranslator(arg) } },
      { label: 'Google', click: () => { launchGoogle(arg) } },
      /*   { role: 'undo' },
       { role: 'redo' },

       { label: 'Travel', type: 'checkbox', checked: true },
       { label: 'eat', type: 'checkbox', checked: false },
     */
      { type: 'separator' },
      {
        label: 'Guardar en...',
        submenu: filesToCopy
      },
      {
        label: 'Mover a...',
        submenu: filesToMove
      }
    ]).popup();

  });
})

elec.ipcMain.on('on-click-choose-file', (event, arg) => {
  noCloseWindow = true;
  window.setAlwaysOnTop(false);
  file.writeConfig(elec.dialog, jsonConfig, 'path', PATH, jsonConfig).then(value => {
    if (value) {
      PATH = value;
      initPath(value);
      iohook.init(window, value, shortcut, replaceFunction, mapKeys);
      window.setAlwaysOnTop(true, 'floating');
    }
    noCloseWindow = false;
  });
})

elec.ipcMain.on('on-click-new-file', (event, arg) => {
  noCloseWindow = true;
  window.setAlwaysOnTop(false);
  file.newFile(elec.dialog, PATH).then(value => {
    if (value) {
      initPath(PATH);
      window.setAlwaysOnTop(true, 'floating');
    }
    noCloseWindow = false;
  });
})

elec.ipcMain.on('select-file', (event, arg) => {
  console.log(arg);
  selectedFile = arg;
})


elec.ipcMain.on('on-click-config', (event, arg) => {
  if (arg) {
    iohook.startShortcuts(shortcut);
  } else {
    iohook.stopShortcuts();
  }
})


elec.ipcMain.on('on-click-save-shortcut', (event, arg) => {
  file.saveShortcut(jsonConfig, 'shortcut', arg, jsonConfig).then(value => {
    if (value) {
      shortcut = value.keycodes;
      stkeys = value.keys
    }
  })
})


elec.ipcMain.on('on-click-save-quick-folder', (event, arg) => {
  file.saveQuickFolder(elec.dialog, jsonConfig, 'quick_folder', arg, jsonConfig).then(value => {
    if (value) {
      quick_folder = value.quick_folder;
    }
  })
})

elec.ipcMain.on('on-click-barcode', (event, arg) => {
  const nets = getLocalNetworks();
  window.webContents.send('network-event', [nets]);
})

elec.ipcMain.on('on-exit-config', (event, arg) => {
  iohook.startShortcuts(shortcut);
})

elec.ipcMain.on('launch-localhost', (event, arg) => {
  elec.shell.openExternal('http://localhost:8100/');
  setTimeout(() => {
    ks.sendKeys(['@123']);
  }, 500);
  setTimeout(() => {
    ks.sendCombination(['control', 'shift', '@77']);
  }, 2000);
})

elec.ipcMain.on('launch-chrome-inspect', (event, arg) => {
  elec.shell.openExternal('chrome://inspect/#devices');
})

elec.ipcMain.on('launch-open-quick-folder', (event, arg) => {
  elec.shell.openExternal(quick_folder);
})


//********************************* SOCKET ***********************************/
const processSocketMsg = (key, value) => {
  switch (key) {
    case 'connection':
      socket.emitMessage('connected', { initialValue: speaker.get() }, value);
      closeNotification();
      showNotification('Dispositivo conectado', 'id: ' + value)
      setTimeout(() => {
        closeNotification();
      }, 1000 * 5);
      break;
    case 'disconnect':
      closeNotification();
      break;
    case 'message':
      setVolume(value);
      socket.emitMessage('response', { changeValue: value });
      break;
    case 'keycode':
      // rawcode
      ks.sendKeys([`@${value}`]);
      break;
    case 'control':
      ks.sendCombination(['control', `@${value}`]);
      break;
    case 'alt':
      ks.sendCombination(['alt', `@${value}`]);
    case 'control-shift':
      ks.sendCombination(['control', 'shift', `@${value}`]);
      break;
    case 'url':
      elec.shell.openExternal(value);
      break;
    default:
      break;
  }
}

//******************************* WIN_VOLUME ************************************/
const setVolume = (value) => {
  speaker.set(value);
}

//************************************ OS ***************************************/
const getLocalNetworks = () => {
  const nets = os.networkInterfaces();
  const results = {};
  if (nets.Ethernet)
    for (const net of nets.Ethernet) {
      results[net.family] = net.address
    }
  return results;
}

const launchWebTranslator = (text) => {
  const SEPARATOR = '%20';
  let procesedText;
  text = text.split();
  const url = `https://translate.google.es/?hl=es&sl=en&tl=es&text=${procesedText}&op=translate`;
  elec.shell.openExternal(url);
}

const launchGoogle = (text) => {
  const url = `https://www.google.com/search?q=${text.value}`
  elec.shell.openExternal(url);
}

//********************************* FILE TXT ***********************************/
const initPath = (path) => {
  file.getFileNames(path).then(res => {
    if (!res.length) {
      file.newTxt(DAFAULT_FILE, '', path);
      res = [DAFAULT_FILE];
    } else if (res.every(element => element !== DAFAULT_FILE)) {
      file.newTxt(DAFAULT_FILE, '', path);
      res.push(DAFAULT_FILE);
    }
    console.log([path, res, stkeys]);
    window.webContents.send('init-event', [path, res, stkeys]);
  });
}

const copyToFile = (toFile, line) => {
  file.readFile(toFile, PATH).then((value) => {
    const element = value.find(element => element.value === line.value);
    if (!element) {
      file.newLine(toFile, line.value, PATH);
    } else {
      const newLines = value.filter(element => element.value !== line.value);
      file.buildTxt(newLines, element, PATH, toFile);
    }
  });
}

const moveLineToFile = (fromFile, toFile, line) => {
  file.readFile(toFile, PATH).then((value) => {
    const element = value.find(element => element.value === line.value);
    if (!element) {
      file.newLine(toFile, line.value, PATH);
    } else {
      const newLines = value.filter(element => element.value !== line.value);
      file.buildTxt(newLines, element, PATH, toFile);
    }
  }).then(() => {
    file.readFile(fromFile, PATH).then((value) => {
      const newLines = value.filter(element => element.value !== line.value);
      file.buildTxt(newLines, null, PATH, fromFile);
      setTimeout(() => {
        window.webContents.send('refresh-page');
      }, 100);
    });
  });
}

const deleteLine = (toFile, line) => {
  elec.dialog.showMessageBox(window,
    {
      type: 'question',
      title: '  Precaución!',
      message: ' Esta acción no se puede deshacer. \n¿Quieres borrar el elemento de todos modos?',
      buttons: ['cancelar', 'aceptar'],
      defaultId: 1,
      cancelId: 0
    }
  ).then(val => {
    if (val.response === 1) {
      file.readFile(toFile, PATH).then((value) => {
        const newLines = value.filter(element => element.value !== line.value);
        file.buildTxt(newLines, null, PATH, toFile);
        setTimeout(() => {
          window.webContents.send('refresh-page');
        }, 100);
      });
    }
  })

}


