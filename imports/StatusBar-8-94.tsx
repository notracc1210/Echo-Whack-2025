import svgPaths from "./svg-3zmh1n7vag";

function Battery() {
  return (
    <div className="absolute contents right-[20.67px] top-[17.33px]" data-name="Battery">
      <div className="absolute h-[11.333px] right-[23px] top-[17.33px] w-[22px]" data-name="Rectangle">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 12">
          <path d={svgPaths.p7e6b880} id="Rectangle" opacity="0.35" stroke="var(--stroke-0, #1A1A1A)" />
        </svg>
      </div>
      <div className="absolute h-[4px] right-[20.67px] top-[21px] w-[1.328px]" data-name="Combined Shape">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2 4">
          <path d={svgPaths.p32d253c0} fill="var(--fill-0, #1A1A1A)" id="Combined Shape" opacity="0.4" />
        </svg>
      </div>
      <div className="absolute h-[7.333px] right-[25px] top-[19.33px] w-[18px]" data-name="Rectangle">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 8">
          <path d={svgPaths.p22aabe00} fill="var(--fill-0, #1A1A1A)" id="Rectangle" />
        </svg>
      </div>
    </div>
  );
}

function RightSide() {
  return (
    <div className="absolute contents right-[20.67px] top-[17.33px]" data-name="Right Side">
      <Battery />
      <div className="absolute h-[10.966px] right-[50.03px] top-[17.33px] w-[15.272px]" data-name="Wifi">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 11">
          <path clipRule="evenodd" d={svgPaths.p6c9880} fill="var(--fill-0, #1A1A1A)" fillRule="evenodd" id="Wifi" />
        </svg>
      </div>
      <div className="absolute h-[10.667px] right-[70.33px] top-[17.67px] w-[17px]" data-name="Mobile Signal">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 11">
          <path clipRule="evenodd" d={svgPaths.p2836df00} fill="var(--fill-0, #1A1A1A)" fillRule="evenodd" id="Mobile Signal" />
        </svg>
      </div>
    </div>
  );
}

export default function StatusBar() {
  return (
    <div className="backdrop-blur-md backdrop-filter bg-[rgba(255,255,255,0.8)] relative size-full" data-name="Status Bar">
      <RightSide />
      <p className="absolute font-['SF_Pro_Text:Semibold',sans-serif] leading-[20px] left-[48px] not-italic text-[#1a1a1a] text-[15px] text-center top-[calc(50%-10px)] tracking-[-0.5px] translate-x-[-50%] w-[54px]">9:41</p>
    </div>
  );
}