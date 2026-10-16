// Tính năng đặc biệt: giỏ hàng gợi ý theo ngân sách. Trả về 4 giỏ cho cùng một ngân sách.
// Điểm ưu tiên: khách cũ = số lần chính họ đã mua; khách mới = tổng số lượng bán ra toàn hệ thống (best-seller).
// Cần Order.items.productId, Order.customerId đã có index; Product.mealType: main | light | snack | beverage.

exports.basketMain = async (/* userId, budget */) => {           // 1. món no quen thuộc (Greedy theo tần suất, mealType = main)
  throw new Error('Chưa triển khai');
};
exports.basketSnack = async (/* userId, budget */) => {          // 2. ăn vặt quen thuộc (mealType = snack)
  throw new Error('Chưa triển khai');
};
exports.basketHotCombo = async (/* budget */) => {               // 3. combo hot: các cặp hay được mua chung trong toàn hệ thống
  throw new Error('Chưa triển khai');
};
exports.basketMix = async (/* userId, budget */) => {            // 4. mix cân bằng main + snack, bỏ bớt món cho vừa ngân sách (0/1 Knapsack)
  throw new Error('Chưa triển khai');
};
