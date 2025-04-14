"use client";

import { useState } from "react";

import { callMeAction } from "#/server/actions/callme";

export function CallMeForm() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  return (
    <div className="flex flex-col gap-4 w-full">
      <h2 className="text-xl font-bold">Call Me</h2>

      <label htmlFor="message" className="font-bold">
        I&apos;m not kidding, this is very stupid. Enter a message for me to
        hear shortly.
      </label>
      <input
        id="message"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="border border-gray-300 p-2 rounded"
        placeholder="Type your message here..."
        maxLength={100}
        required
      />
      <button
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        onClick={async () => {
          await callMeAction(input);
          setStatus("success");
        }}
      >
        Call Me
      </button>
      {status === "success" && (
        <p className="text-green-500">Call initiated successfully!</p>
      )}
    </div>
  );
}
