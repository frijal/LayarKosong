// test-minify.js
import { minify } from "@minify-html/wasm";

const html = "<html><body>  <h1> Test </h1>  </body></html>";
const out = minify(Buffer.from(html), { collapse_whitespaces: true });
console.log(Buffer.from(out).toString("utf8"));
