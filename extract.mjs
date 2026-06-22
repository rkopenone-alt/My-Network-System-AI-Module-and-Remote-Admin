import { htmlString } from './rescuer-app/htmlStr.js';
import * as fs from 'fs';

const html = htmlString;
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
    const js = scriptMatch[1];
    fs.writeFileSync('extracted.js', js, 'utf8');
    console.log('Extracted js length:', js.length);
} else {
    console.log('No script found');
}
