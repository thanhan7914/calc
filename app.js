const { createApp } = Vue;

createApp({
  data() {
    return {
      totalAmount: 0,
      vatRate: 10,
      products: [
        // { name: "Rượu vang De La Rosa Rosso 750ml", price: 75000 },
        // { name: "Rượu vang Marcoli Rosso 750ml", price: 55000 },
        // { name: "Rượu vang Segreto Negroamaro 750ml", price: 90000 },
        // { name: "Rượu vang 1933 Rosso 750ml", price: 110000 },
        // { name: "Rượu vang Tolucci đỏ 14% 750ml", price: 62000 },
        // {
        //   name: "Rượu Vang Francis Gillot Sauvignon Blanc 750ml",
        //   price: 60909,
        // },
        // {
        //   name: "Rượu Vang Francis Gillot Cabernet Sauvignon 750ml",
        //   price: 60000,
        // },
      ],
      calculatedResults: [],
      showResults: false,
      errorMessage: "",
      successMessage: "",
      isAdjustLastPrice: false,
      adjustIndex: -1,
    };
  },
  computed: {
    totalBeforeVAT() {
      return Math.round(this.totalAmount / (1 + this.vatRate / 100));
    },
    vatAmount() {
      return this.totalAmount - this.totalBeforeVAT;
    },
    totalProducts() {
      return this.products.length;
    },
  },
  methods: {
    scrollToElement(css) {
      this.$nextTick(() => {
        document.querySelector(css).scrollIntoView();
      });
    },
    addProduct() {
      this.products.push({
        name: "Sản phẩm #" + this.totalProducts,
        price: 0,
      });
      this.scrollToElement("#controls");
    },
    removeProduct(index) {
      this.products.splice(index, 1);
    },
    formatNumber(num) {
      return new Intl.NumberFormat("vi-VN").format(num);
    },
    removeAllProducts() {
      let y = confirm("Xác nhận xóa?");
      if (y) {
        this.products = [];
      }
    },
    calculate() {
      this.showResults = true;
      this.errorMessage = "";
      this.successMessage = "";
      this.calculatedResults = [];

      if (!this.totalAmount || this.totalAmount <= 0) {
        this.errorMessage = "Vui lòng nhập tổng tiền hợp lệ!";
        return;
      }

      if (!this.vatRate || this.vatRate < 0) {
        this.errorMessage = "Vui lòng nhập thuế suất VAT hợp lệ!";
        return;
      }

      const validProducts = this.products.filter((p) => p.name && p.price > 0);
      if (validProducts.length === 0) {
        this.errorMessage =
          "Vui lòng nhập ít nhất một sản phẩm với đơn giá hợp lệ!";
        return;
      }

      const target = this.totalBeforeVAT;
      const result = balancedMinError(
        validProducts.map((item) => Math.round(item.price)),
        target
      );

      this.calculatedResults = validProducts.map((item, idx) => ({
        name: item.name,
        price: item.price,
        quantity: result.x[idx],
        subtotal: item.price * result.x[idx],
      }));
      const multiple = 1 + this.vatRate / 100;
      const esp = this.calcError();
      const endItemIdx = this.calculatedResults.length - 1;
      const lastItem = this.calculatedResults[endItemIdx];
      if (Math.abs(esp) >= lastItem.quantity) {
        const newPrice = Number(
          (lastItem.price + esp / (lastItem.quantity * multiple)).toFixed(3)
        );
        lastItem.price = newPrice;
        lastItem.subtotal = newPrice * lastItem.quantity;
        this.isAdjustLastPrice = true;
        this.adjustIndex = endItemIdx;
      }
      const error = this.calcError();
      this.successMessage = `✅ Tìm được phương án tối ưu! Sai số: ${this.formatNumber(
        Math.abs(error)
      )} VNĐ`;

      this.scrollToElement("#calculated");
    },
    calcError() {
      const multiple = 1 + this.vatRate / 100;
      const total = Number(
        (
          this.calculatedResults.reduce((a, b) => a + b.subtotal, 0) * multiple
        ).toFixed(3)
      );
      return this.totalAmount - total;
    },
  },
}).mount("#app");
