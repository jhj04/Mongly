const INFO_ITEMS = ["버전", "업데이트 내역", "이용약관", "문의하기"];

export default function InfoSection() {
  return (
    <section className="flex flex-col p-8 rounded-[2rem] bg-[rgba(255,250,245,0.1)] border border-white/40 shadow-drop backdrop-blur-sm">
      <h2 className="font-point text-xl text-primary-800 mb-2">정보</h2>
      {INFO_ITEMS.map((item) => (
        <button
          key={item}
          className="text-left py-3 font-point text-lg text-primary-900 hover:text-primary-900 transition-colors border-b border-black/5 last:border-none"
        >
          {item}
        </button>
      ))}
    </section>
  );
}
