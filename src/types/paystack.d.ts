declare module '@paystack/inline-js' {
  export interface PaystackTransactionResult {
    reference?: string;
    status?: string;
    trans?: string;
    transaction?: string;
    trxref?: string;
  }

  export interface PaystackResumeCallbacks {
    onSuccess?: (transaction: PaystackTransactionResult) => void;
    onCancel?: () => void;
    onLoad?: () => void;
    onError?: (error: { message?: string }) => void;
  }

  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: PaystackResumeCallbacks): void;
    cancelTransaction(id?: string): void;
  }
}
