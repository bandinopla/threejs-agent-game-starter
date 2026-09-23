type Vec2 = { x: number; y: number };

export class JoystickUI {
	private _enabled = false;

	get enabled() { return this._enabled; }
	set enabled(v: boolean) { this._enabled = v; this.el.style.display = v ? "block" : "none"; }

    el: HTMLDivElement;
    base: HTMLDivElement;
    stick: HTMLDivElement;

    radius!: number;
    active = false;
    pointerId: number | null = null;
    private radiusVh: number;

    center: Vec2 = { x: 0, y: 0 };
    value: Vec2 = { x: 0, y: 0 };

	onChange?: (value: Vec2) => void;
	onStart?: () => void;
	onEnd?: () => void;

    constructor(
        radiusVh = 60,
        readonly side: "left" | "right" = "left",
    ) {
        this.radiusVh = radiusVh;
        
        const radius = 0;

        window.addEventListener("resize", this.updateRadius);

        this.el = document.createElement("div");
        this.el.style.position = "fixed";
        this.el.style.top = "0";
        this.el.style.width = "50%";
        this.el.style.height = "100%";
        this.el.style.touchAction = "none";
        this.el.style.pointerEvents = "auto";
        this.el.style.zIndex = side === "left" ? "1" : "2";

        if (side === "left") {
            this.el.style.left = "0";
        } else {
            this.el.style.right = "0";
        }

        this.base = document.createElement("div");
        this.base.style.position = "absolute";
        this.base.style.width = `${radius * 2}px`;
        this.base.style.height = `${radius * 2}px`;
        this.base.style.borderRadius = "50%";
        this.base.style.border = "1px dashed rgba(255,255,255,0.2)";
        this.base.style.opacity = "0.1";
        this.base.style.transform = "translate(-50%, -50%)";

        this.stick = document.createElement("div");
        this.stick.style.position = "absolute";
        this.stick.style.width = `${radius}px`;
        this.stick.style.height = `${radius}px`;
        this.stick.style.borderRadius = "50%";
        this.stick.style.background = "rgba(255,255,255,0.2)";
        this.stick.style.transform = "translate(-50%, -50%)";

        this.base.appendChild(this.stick);
        this.el.appendChild(this.base);
        document.body.appendChild(this.el);

        // default position 20%
        const x =
            side === "left" ? window.innerWidth * 0.2 : window.innerWidth * 0.8;
        const y = window.innerHeight * 0.8;

        this.center = { x, y };
        this.base.style.left = `${x}px`;
        this.base.style.top = `${y}px`;

        this.bind();
		this.updateRadius();

		this.enabled = false;
    }

    private updateRadius = () => {
        this.radius = Math.min( 110, (window.innerHeight * this.radiusVh) / 100 );

        this.base.style.width = `${this.radius * 2}px`;
        this.base.style.height = `${this.radius * 2}px`;

        this.stick.style.width = `${this.radius}px`;
        this.stick.style.height = `${this.radius}px`;
    };

    private bind() {
        this.el.addEventListener("pointerdown", this.onDown);
        this.el.addEventListener("pointermove", this.onMove);
        this.el.addEventListener("pointerup", this.onUp);
        this.el.addEventListener("pointercancel", this.onUp);
		
    }

    private onDown = (e: PointerEvent) => {
        if (!this.enabled ||this.active) return;

        // only react if pointer starts inside this half
        const rect = this.el.getBoundingClientRect();
        if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
        )
            return;

        e.stopPropagation(); 

        this.active = true;
        this.pointerId = e.pointerId;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.center.x = x;
		this.center.y = y;

        this.base.style.left = `${x}px`;
        this.base.style.top = `${y}px`;
        this.base.style.opacity = "1";

        this.el.setPointerCapture(e.pointerId);

        this.updateStick(e.clientX, e.clientY);

		this.onStart?.();
    };

    private onMove = (e: PointerEvent) => {
        if (!this.enabled || !this.active || e.pointerId !== this.pointerId) return;
        this.updateStick(e.clientX, e.clientY);
    };

    private onUp = (e: PointerEvent) => {
        if (!this.enabled || e.pointerId !== this.pointerId) return;

        this.active = false;
        this.pointerId = null;

        this.value.x=0;
		this.value.y=0;
        this.base.style.opacity = "0.1";
        this.stick.style.left = `50%`;
        this.stick.style.top = `50%`;

		this.onChange?.(this.value);
		this.onEnd?.();
    };

    private updateStick(x: number, y: number) {
        const rect = this.el.getBoundingClientRect();
        const dx = x - rect.left - this.center.x;
        const dy = y - rect.top - this.center.y;

        const dist = Math.hypot(dx, dy);
        const max = this.radius;

        const nx = dist > max ? (dx / dist) * max : dx;
        const ny = dist > max ? (dy / dist) * max : dy;

        this.value.x = nx / max;
		this.value.y = ny / max;

        this.stick.style.left = `${50 + (nx / max) * 50}%`;
        this.stick.style.top = `${50 + (ny / max) * 50}%`;

		this.onChange?.(this.value);
    }

    getValue() {
        return this.value;
    }
}
