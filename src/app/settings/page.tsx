"use client";

import { useState } from "react";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import CircleCheckbox from "@/components/CircleCheckbox";
import { DUMMY_USER_ID, DUMMY_FRIENDS } from "@/data/dummy";
import { glassShadow } from "@/lib/styles";

const INFO_ITEMS = ["버전", "업데이트 내역", "이용약관", "문의하기"];

export default function SettingsPage() {
  const [userId, setUserId] = useState(DUMMY_USER_ID);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  const toggleFriend = (idx: number) => {
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-6 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <section className="flex flex-col gap-4 p-8 rounded-[2rem] bg-[rgba(255,250,245,0.1)] border border-white/40 shadow-drop backdrop-blur-sm">
          <h2 className="font-point text-xl text-primary-800">계정</h2>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-6">
              <span className="w-24 shrink-0 font-point text-lg text-primary-900">아이디 수정</span>
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1">
                  <TextField label="아이디" value={userId} onChange={setUserId} />
                </div>
                <Button label="중복 확인" variant="filled" size="md" onClick={() => {}} />
              </div>
            </div>
            <span className="pl-34 pr-2 text-xs text-primary-900">사용할 수 있는 아이디예요.</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-6">
                <span className="w-24 shrink-0 font-point text-lg text-primary-900">비밀번호 변경</span>
                <div className="flex-1">
                  <TextField
                    label="비밀번호"
                    type="password"
                    value={password}
                    onChange={setPassword}
                  />
                </div>
              </div>
              <div className="pl-30">
                <TextField
                  label="비밀번호 확인"
                  type="password"
                  value={passwordConfirm}
                  onChange={setPasswordConfirm}
                />
              </div>
            </div>
            <span className="pl-34 pr-2 text-xs text-primary-900">비밀번호가 일치해요.</span>
          </div>

          <div className="flex gap-3 mt-2">
            <Button label="계정 삭제하기" variant="danger" className="flex-1" onClick={() => {}} />
            <Button label="로그아웃" variant="outlined" className="flex-1" onClick={() => {}} />
          </div>
        </section>

        <section className="flex flex-col gap-4 p-8 rounded-[2rem] bg-[rgba(255,250,245,0.1)] border border-white/40 shadow-drop backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-point text-xl text-primary-800">친구</h2>
            <span className="font-point text-primary-900">{DUMMY_FRIENDS.length}/10</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {DUMMY_FRIENDS.map((name, idx) => (
              <CircleCheckbox
                key={idx}
                label={name}
                checked={selected.includes(idx)}
                onChange={() => toggleFriend(idx)}
              />
            ))}
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              label="취소하기"
              variant="outlined"
              className="flex-1"
              onClick={() => setSelected([])}
            />
            <Button
              label={`${selected.length}명 삭제하기`}
              variant="danger"
              className="flex-1"
              onClick={() => {}}
            />
          </div>
        </section>

        <section className="flex flex-col p-8 rounded-[2rem] bg-[rgba(255,250,245,0.1)] border border-white/40 shadow-drop backdrop-blur-sm">
          <h2 className="font-point text-xl text-primary-800 mb-2">정보</h2>
          {INFO_ITEMS.map((item) => (
            <button
              key={item}
              className="text-left py-3 font-point text-sm text-primary-900 hover:text-primary-900 transition-colors border-b border-black/5 last:border-none"
            >
              {item}
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
