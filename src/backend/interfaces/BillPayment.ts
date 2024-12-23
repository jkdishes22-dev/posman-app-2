export type BillPaymentInterface = {
    paymentMethod: string,
    cashAmount?: number,
    mpesaAmount?: number,
    mpesaCode?: string,
    pendingAmount?: number,
    billId: number,
    userId?: number
}