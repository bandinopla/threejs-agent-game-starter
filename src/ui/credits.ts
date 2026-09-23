
import { $credits } from "../credits";
import { isMobile } from "../utils/isMobile";
import styles from "./credits.module.css";

let onCloseCallback:VoidFunction|undefined;
const div = document.createElement("div"); 
div.className = styles.root;

div.addEventListener("click", (ev)=>ev.stopPropagation());

div.innerHTML = `
	${
		$credits.map(section => `
			<h2>${section.section}</h2>
		 
				${section.people.map(person => `
					<div class="${styles.person}"><a href="${person[1]}" target="_blank"><strong>${person[0]}</strong>&nbsp;${person[2] ?? ""}</a></div>
				`).join("")}
			 
		`).join("")
	}
	<button id="close" class="${styles.btnClose}">Close</button>
`;

div.querySelector("#close")?.addEventListener("click", () => {
		document.body.removeChild(div); 

		if(!isMobile()) {
			document.body.requestPointerLock();
		}
		onCloseCallback?.();
	});

export function showCredits( onClose?:VoidFunction ) {

	if(!isMobile()) {
		document.exitPointerLock()
	}
	document.body.appendChild(div);

	// div.innerHTML = `
	// 	<h1>Credits</h1>
	// 	<p>Made by</p>
	// 	<p>Gnome</p>
	// 	<p>Monkeys</p>
	// 	<button id="close">Close</button>
	// `;
 
	onCloseCallback = onClose;

	
}