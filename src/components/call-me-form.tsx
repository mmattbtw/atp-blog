"use client";

import { useState } from "react";

import { callMeAction } from "#/server/actions/callme";

import { Paragraph, Title } from "./typography";

export function CallMeForm() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  return (
    <div className="flex flex-col gap-4 w-full">
      <Title level="h2" className="text-xl font-bold">
        Call Me
      </Title>

      <Paragraph>
        I&apos;m not kidding, this is very stupid. Enter a message for me to
        hear shortly.
      </Paragraph>
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
          const action = await callMeAction(input);
          if (action.success) {
            setStatus("success");
          } else {
            setStatus("error");
          }
        }}
      >
        Call Me
      </button>
      {status === "success" && (
        <Paragraph className="text-green-500">
          Call initiated successfully!
        </Paragraph>
      )}
      {status === "error" && (
        <Paragraph className="text-red-500">
          Error initiating call. Please try again in a minute.
        </Paragraph>
      )}
    </div>
  );
}
