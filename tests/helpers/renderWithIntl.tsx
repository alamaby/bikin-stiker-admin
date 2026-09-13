import React from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/id.json";

// Wrap with the real Indonesian messages so component translations are exercised.
export function renderWithIntl(ui: React.ReactElement) {
  return render(<NextIntlClientProvider locale="id" messages={messages} timeZone="Asia/Jakarta" now={new Date("2026-09-13T12:00:00Z")}>
    {ui}
  </NextIntlClientProvider>);
}
