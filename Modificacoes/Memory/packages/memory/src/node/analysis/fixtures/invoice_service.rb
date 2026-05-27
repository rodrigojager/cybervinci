module Billing
  class InvoiceService
    def total_for(account)
      calculate(account)
    end
  end
end
