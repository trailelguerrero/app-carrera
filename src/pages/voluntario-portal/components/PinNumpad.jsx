import { useState } from "react";

export function PinNumpad({ value, onChange, shake, disabled }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const [pressed, setPressed] = useState(null);

  const tap = (k) => {
    setPressed(k); setTimeout(() => setPressed(null), 150);
    if (disabled) return;
    if (k === "⌫") { onChange(value.slice(0,-1)); return; }
    if (value.length >= 4) return;
    onChange(value + k);
  };

  return (
    <div>
      <div className={`vp-pin-display${shake ? " vp-shake" : ""}`}>
        {[0,1,2,3].map(i => <div key={i} className={`vp-pin-dot${i < value.length ? " filled" : ""}`} />)}
      </div>
      <div className="vp-numpad">
        {keys.map((k, i) => k === "" ? <div key={i}/> :
          <button key={i}
            className={`vp-numpad-key${k==="⌫"?" backspace":""}${pressed===k?" pressed":""}`}
            onClick={() => tap(k)} disabled={disabled}>{k}</button>
        )}
      </div>
    </div>
  );
}
