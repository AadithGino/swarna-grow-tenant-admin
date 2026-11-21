/**
 * Wording for the return flow. An order paid with matured scheme value can only be returned: the
 * form submits a return and the API refuses an exchange, so the page must not offer one.
 */
export function returnFlowCopy(schemeFunded: boolean) {
  if (schemeFunded) {
    return {
      heading: "Returns",
      intro:
        "Not quite right? Send a return request. The store approves it and confirms any refund separately. For a replacement, place a new order once your return is settled.",
      button: "Request return",
      dialogTitle: "Return request",
      dialogNote:
        "This sends a request to the store. Refunds are confirmed separately and nothing is refunded automatically. Orders paid with scheme value can be returned but not exchanged; a replacement needs a new purchase.",
    };
  }
  return {
    heading: "Returns & exchanges",
    intro: "Not quite right? Send a return or exchange request. The store approves it and confirms any refund separately.",
    button: "Request return or exchange",
    dialogTitle: "Return or exchange request",
    dialogNote:
      "This sends a request to the store. Refunds and exchanges are confirmed separately — nothing is refunded automatically.",
  };
}
