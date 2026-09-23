// import wasm from "vite-plugin-wasm";  
// import { defineConfig } from "vite";

// export default defineConfig({
//   plugins: [
//     wasm(), 
//   ]
// });
import wasm from "vite-plugin-wasm";
import { defineConfig } from "vite";

export default defineConfig({
	 base: './',
	plugins: [
		wasm(),
	],

	resolve: {
		alias: {
			'@dimforge/rapier3d': 'https://cdn.skypack.dev/@dimforge/rapier3d-compat'
		}
	},

	build: {
		minify: "terser",
 

		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
				passes:2
			},
		},
	},
});