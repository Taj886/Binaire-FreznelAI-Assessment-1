
import React from "react";
import { render } from "ink";
import App from "./App.jsx";

const ENTER_SCREEN = "\x1b[?1049h\x1b[?25l";
const LEAVE_SCREEN = "\x1b[?25h\x1b[?1049l";

process.stdout.write(ENTER_SCREEN);

process.on("exit", () => {
    process.stdout.write(LEAVE_SCREEN);
});

const app = render(<App />, {
    exitOnCtrlC: true,
    patchConsole: false
});

app.waitUntilExit().then(() => {
    process.exit(0);
});
