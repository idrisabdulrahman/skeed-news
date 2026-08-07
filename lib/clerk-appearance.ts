// Clerk auth card styling, matched to the Skeem editorial light palette
// (hex values derived from tokens.css oklch values): paper white surfaces,
// hairline borders, ink primary button, cobalt accent. Geist everywhere,
// mono is retired from interface text per design.md.
export const clerkAppearance = {
  variables: {
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#1B1F27",
    colorText: "#1B1F27",
    colorTextSecondary: "#44484E",
    colorPrimary: "#2F60C0",
    colorDanger: "#D01C25",
    borderRadius: "4px",
    fontFamily: "var(--font-geist-sans), sans-serif",
    fontFamilyButtons: "var(--font-geist-sans), sans-serif",
  },
  elements: {
    card: "shadow-none border border-[#D2D4D8] bg-[#FFFFFF]",
    headerTitle: "text-[#1B1F27] font-bold tracking-tight",
    headerSubtitle: "text-[#44484E]",
    formButtonPrimary:
      "bg-[#1B1F27] text-[#FFFFFF] hover:bg-[#2F60C0] hover:text-[#FBFCFD] font-medium",
    formFieldInput:
      "bg-[#FFFFFF] border-[#D2D4D8] text-[#1B1F27] focus:border-[#2F60C0]",
    formFieldLabel: "text-[#44484E] text-sm",
    footerActionLink: "text-[#2F60C0] hover:text-[#1B1F27]",
    identityPreviewText: "text-[#1B1F27]",
    dividerLine: "bg-[#E4E6EA]",
    dividerText: "text-[#66696E]",
    socialButtonsBlockButton:
      "border-[#D2D4D8] text-[#1B1F27] hover:bg-[#F2F5F9]",
  },
};
