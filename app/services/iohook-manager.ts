const ioHook = require('iohook');
const clipboard = require("copy-paste");
const file = require("./file");
const DAFAULT_FILE = 'main.txt';
const elect = require('electron');

export class IOHook {

    private CC = {
        ESC: 1,
        CTRL: 29,
        RCTRL: 3613,
        c: 46,
        x: 45
    }

    private window;
    private PATH;
    private oldClipboard = '';

    private maxWidth = 560 + 50 // TODO 560 inyectar desde ele main

    public init(win, path, shortcut, replaceFunction, mapKeys) {
        this.window = win;
        this.PATH = path;
        ioHook.stop();
        ioHook.unregisterAllShortcuts();
        this.startShortcuts(shortcut)
        ioHook.start();
    }

    public startShortcuts(shortcut) {
        this.registerShorcuts(shortcut)
        if (!ioHook.listeners('mousemove').length) {
            ioHook.addListener('mousemove', this.onMoveMouse);
        };
        if (!ioHook.listeners('keydown').length) {
            ioHook.addListener('keydown', this.onKeyDown);
        };
        ioHook.start();
    }

    public stopShortcuts() {
        ioHook.unregisterAllShortcuts();
        ioHook.removeListener('mousemove', this.onMoveMouse);
        ioHook.removeListener('keydown', this.onKeyDown);
        ioHook.stop();
    }

    private registerShorcuts(shortcut) {
        // ctrl + c
        ioHook.registerShortcut([this.CC.CTRL, this.CC.c],
            (keys) => {
            },
            (keys) => {
                if (this.window) {
                    this.copyFunction();
                }
            });

        // Rctrl + c
        ioHook.registerShortcut([this.CC.RCTRL, this.CC.c],
            (keys) => {
            },
            (keys) => {
                if (this.window) {
                    this.copyFunction();
                }
            });

        // ctrl + x
        ioHook.registerShortcut([this.CC.CTRL, this.CC.x],
            (keys) => {
            },
            (keys) => {
                if (this.window) {
                    this.copyFunction();
                }
            });

        // Rctrl + x
        ioHook.registerShortcut([this.CC.RCTRL, this.CC.x],
            (keys) => {
            },
            (keys) => {
                if (this.window) {
                    this.copyFunction();
                }
            });

        // abrir ventana
        ioHook.registerShortcut(shortcut,
            (keys) => {
            },
            (keys) => {
                if (this.window && this.window.isMinimized()) {
                    setTimeout(() => {
                        this.window.restore();
                        if (this.window['position_x']) {
                            this.window.setPosition(this.window['position_x'], this.window['position_y']);
                        }
                    }, 100);
                } else if (this.window && !this.window.isMinimized()) {
                    this.window.minimize();
                }
            });

        // ESC
        ioHook.registerShortcut([this.CC.ESC],
            (keys) => {
            },
            (keys) => {
                if (this.window && !this.window.isMinimized()) {
                    this.window.minimize();
                }
            });
    }


    private onMoveMouse(event) {
        console.log(event);
        if (this.window) {
            const disp = elect.screen.getAllDisplays();
            this.window['position_x'] = event.x + 50;
            this.window['position_y'] = event.y - 100;
            if (this.window && this.window.isMinimized() && disp.length === 1) {
                if (event.x < disp[0].bounds.width && event.x > disp[0].bounds.width - this.maxWidth) {
                    this.window['position_x'] = event.x - this.maxWidth;
                }
                if (this.window['position_y'] < 0) {
                    this.window['position_y'] = 0;
                }
                if (this.window['position_y'] > disp[0].bounds.height - 540) {
                    this.window['position_y'] = disp[0].bounds.height - 540;
                }
            }
            if (this.window && this.window.isMinimized() && disp.length === 2) {
                if (event.x < 0 && event.x > - this.maxWidth) {
                    this.window['position_x'] = event.x - this.maxWidth;
                } else if (event.x < disp[1].bounds.width && event.x > disp[1].bounds.width - this.maxWidth) {
                    this.window['position_x'] = event.x - this.maxWidth;
                } else if (event.x > 2 * disp[1].bounds.width - this.maxWidth) {
                    this.window['position_x'] = event.x - this.maxWidth;
                }
                if (this.window['position_y'] < 0) {
                    this.window['position_y'] = 0;
                }
                if (this.window['position_y'] > disp[1].bounds.height - 540) {
                    this.window['position_y'] = disp[1].bounds.height - 540;
                }
                //console.log(this.window['position_x'] + ' - ' + this.window['position_y']);
            }
        }
    };

    private onKeyDown(event) {
        this.window.webContents.send('key-event', [event]);
        console.log(JSON.stringify(event));
    };

    private copyFunction(toFile?) {
        clipboard.paste((err, value) => {
            if (err) {
                console.log(err.stack);
                return
            }
            const st = value.trim();
            if (!toFile) {
                toFile = DAFAULT_FILE;
            }
            file.readFile(toFile, this.PATH).then((value) => {
                if (st && st !== this.oldClipboard) {
                    this.oldClipboard = st;
                    const element = value.find(element => element.value === st);
                    if (!element) {
                        file.newLine(toFile, st, this.PATH);
                        this.window.webContents.send('refresh-page');
                    } else {
                        const newLines = value.filter(element => element.value !== st);
                        file.buildTxt(newLines, element, this.PATH, toFile);
                        this.window.webContents.send('refresh-page');
                    }
                }
            });
        })
    }

}
