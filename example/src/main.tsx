import "./style.css";
import { signal, effect } from "@gchumillas/usignals";

export const Main = () => {
  const width = signal(5);
  const height = signal(7);
  const areaNode = <span />;

  const handleInputWidth = (val: string) => {
    width.set(parseFloat(val));
  };

  const handleInputHeight = (val: string) => {
    height.set(parseFloat(val));
  };

  effect(() => {
    areaNode.textContent = `${width.get() * height.get()}`;
  });

  return (
    <div>
      <input
        type="text"
        placeholder="width"
        value={width.get()}
        onInput={(e) => handleInputWidth(e.currentTarget.value)}
      />
      <span>x</span>
      <input
        type="text"
        placeholder="height"
        value={height.get()}
        onInput={(e) => handleInputHeight(e.currentTarget.value)}
      />
      <span>=</span>
      {areaNode}
    </div>
  );
};
