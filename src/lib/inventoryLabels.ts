export const inventoryLabels: Record<string, [string, string]> = {
  WAITING_VIEWER: ["Ready for your action", "Ожидает вашего решения"],
  WAITING_OPERATOR: ["Operator review", "Проверка оператором"],
  TRADE_LINK_REQUIRED: ["Trade link required", "Нужна ссылка обмена"],
  ORDER_PENDING: ["Market order in progress", "Заказ на маркете"],
  TRADE_WAITING: ["Steam trade waiting", "Ожидается обмен Steam"],
  TRADE_ACCEPTED: ["Accepted, awaiting final Market confirmation", "Принят, ожидает итогового подтверждения маркета"],
  RETRY_AVAILABLE: ["Delivery attempt ended", "Попытка доставки завершилась"],
  INSUFFICIENT_FUNDS: ["Market balance insufficient", "Недостаточно средств на маркете"],
  RECONCILIATION_REQUIRED: ["Checking Market state", "Проверка состояния маркета"],
  OPERATOR_REVIEW: ["Trade outcome needs review", "Итог обмена требует проверки"],
  DELIVERED: ["Delivered", "Доставлено"],
  REFUNDING: ["Returning Channel Points", "Возврат баллов"],
  REFUNDED: ["Channel Points returned", "Баллы возвращены"],
};

export const attemptLabels: Record<string, [string, string]> = {
  seller_not_sent: ["Seller did not send the trade", "Продавец не отправил обмен"],
  buyer_not_accepted: ["Trade was not accepted", "Обмен не был принят"],
  seller_cancelled: ["Seller cancelled the trade", "Продавец отменил обмен"],
  buyer_reverted: ["You reverted the accepted trade", "Вы отменили принятый обмен"],
  seller_reverted: ["Seller reverted the accepted trade", "Продавец отменил принятый обмен"],
  terminal_unclassified: ["Trade ended; operator review needed", "Обмен завершён; требуется проверка оператора"],
};
