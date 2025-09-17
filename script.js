class HillCipher {
  constructor() {
    this.initializeEventListeners();
    this.updateMatrixInfo();
    this.updateCharCount();
  }

  initializeEventListeners() {
    // Кнопки операцій
    document
      .getElementById("encrypt-btn")
      .addEventListener("click", () => this.performOperation("encrypt"));
    document
      .getElementById("decrypt-btn")
      .addEventListener("click", () => this.performOperation("decrypt"));
    document
      .getElementById("reset-btn")
      .addEventListener("click", () => this.resetAll());

    // Моніторинг вводу тексту
    document
      .getElementById("text-input")
      .addEventListener("input", () => this.updateCharCount());

    // Моніторинг вводу матриці з валідацією
    document.querySelectorAll(".matrix-cell").forEach((cell) => {
      cell.addEventListener("input", () => {
        this.validateMatrixCell(cell);
        this.updateMatrixInfo();
      });

      cell.addEventListener("blur", () => {
        this.validateMatrixCell(cell);
      });
    });
  }

  validateMatrixCell(cell) {
    const value = cell.value;
    const parsedValue = parseInt(value);

    // Видаляємо існуючі класи помилок
    cell.classList.remove("error", "warning");

    if (value === "") {
      cell.classList.add("error");
      cell.title = "This field is required";
    } else if (isNaN(parsedValue)) {
      cell.classList.add("error");
      cell.title = "Please enter a valid number";
    } else if (parsedValue < 0 || parsedValue > 25) {
      cell.classList.add("warning");
      cell.title = "Value must be between 0 and 25";
    } else {
      cell.title = "Valid matrix value";
    }
  }

  updateCharCount() {
    const textInput = document.getElementById("text-input");
    const charCount = document.querySelector(".char-count");
    const statusIndicator = document.querySelector(".status-indicator");

    const text = textInput.value;
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");

    charCount.textContent = `${cleanText.length} characters`;

    if (cleanText.length > 0) {
      statusIndicator.textContent = "Ready";
      statusIndicator.style.background = "var(--success)";
    } else {
      statusIndicator.textContent = "Empty";
      statusIndicator.style.background = "var(--warning)";
    }
  }

  updateMatrixInfo() {
    try {
      const matrix = this.getKeyMatrix();
      const det = this.determinant3x3(matrix);
      const detMod = this.mod(det, 26);
      const isValid = this.validateMatrix(matrix);

      document.getElementById("determinant").textContent = det;
      document.getElementById("det-mod").textContent = detMod;

      const matrixStatus = document.querySelector(".matrix-status");
      const statusIcon = matrixStatus.querySelector("i");
      const statusText = matrixStatus.querySelector("span");

      if (isValid) {
        statusIcon.className = "fas fa-check-circle";
        statusText.textContent = "Matrix is valid";
        matrixStatus.style.color = "var(--success)";
      } else {
        statusIcon.className = "fas fa-exclamation-circle";
        statusText.textContent = "Matrix is invalid (not invertible mod 26)";
        matrixStatus.style.color = "var(--error)";
      }
    } catch (error) {
      // Обробка помилок валідації (порожні поля, значення поза межами)
      document.getElementById("determinant").textContent = "—";
      document.getElementById("det-mod").textContent = "—";

      const matrixStatus = document.querySelector(".matrix-status");
      const statusIcon = matrixStatus.querySelector("i");
      const statusText = matrixStatus.querySelector("span");

      statusIcon.className = "fas fa-times-circle";
      statusText.textContent = error.message;
      matrixStatus.style.color = "var(--error)";

      console.error("Matrix validation error:", error.message);
    }
  }

  performOperation(operation) {
    const textInput = document.getElementById("text-input");
    const text = textInput.value;

    if (!text.trim()) {
      this.showError("Please enter some text to process");
      return;
    }

    try {
      const matrix = this.getKeyMatrix();
      if (!this.validateMatrix(matrix)) {
        this.showError(
          "Matrix is not invertible mod 26. Please adjust the matrix values."
        );
        return;
      }

      let result;
      if (operation === "encrypt") {
        result = this.encrypt(text, matrix);
        this.displayResults(
          "Encryption",
          text,
          result.output,
          result.steps,
          matrix
        );
      } else {
        result = this.decrypt(text, matrix);
        this.displayResults(
          "Decryption",
          text,
          result.output,
          result.steps,
          matrix,
          result.inverse
        );
      }
    } catch (error) {
      this.showError(error.message);
    }
  }

  encrypt(plaintext, matrix) {
    const preparedText = this.prepareText(plaintext);
    const steps = [];
    let result = "";

    steps.push({
      type: "info",
      content: `Original text: "${plaintext}"`,
    });
    steps.push({
      type: "info",
      content: `Prepared text: "${preparedText}" (padded to multiple of 3)`,
    });
    steps.push({
      type: "matrix",
      content: `Encryption matrix:`,
      matrix: matrix,
    });

    // Обробка тексту по триплетах
    for (let i = 0; i < preparedText.length; i += 3) {
      const triplet = preparedText.substr(i, 3);
      const numbers = [
        this.letterToNumber(triplet[0]),
        this.letterToNumber(triplet[1]),
        this.letterToNumber(triplet[2]),
      ];

      steps.push({
        type: "step",
        content: `Block "${triplet}" → [${numbers.join(", ")}]`,
      });

      const encrypted = this.matrixVectorMultiply(matrix, numbers);
      const encryptedTriplet =
        this.numberToLetter(encrypted[0]) +
        this.numberToLetter(encrypted[1]) +
        this.numberToLetter(encrypted[2]);

      steps.push({
        type: "calculation",
        content: `Matrix × Vector = [${encrypted.join(
          ", "
        )}] → "${encryptedTriplet}"`,
      });

      result += encryptedTriplet;
    }

    return { output: result, steps };
  }

  decrypt(ciphertext, matrix) {
    const preparedText = this.prepareText(ciphertext);
    const steps = [];
    let result = "";

    // Обчислення оберненої матриці
    const inverseMatrix = this.matrixInverse3x3(matrix);

    steps.push({
      type: "info",
      content: `Ciphertext: "${ciphertext}"`,
    });
    steps.push({
      type: "info",
      content: `Prepared text: "${preparedText}"`,
    });
    steps.push({
      type: "matrix",
      content: `Original matrix:`,
      matrix: matrix,
    });
    steps.push({
      type: "matrix",
      content: `Inverse matrix:`,
      matrix: inverseMatrix,
    });

    // Обробка тексту по триплетах для дешифрування
    for (let i = 0; i < preparedText.length; i += 3) {
      const triplet = preparedText.substr(i, 3);
      const numbers = [
        this.letterToNumber(triplet[0]),
        this.letterToNumber(triplet[1]),
        this.letterToNumber(triplet[2]),
      ];

      steps.push({
        type: "step",
        content: `Block "${triplet}" → [${numbers.join(", ")}]`,
      });

      const decrypted = this.matrixVectorMultiply(inverseMatrix, numbers);
      const decryptedTriplet =
        this.numberToLetter(decrypted[0]) +
        this.numberToLetter(decrypted[1]) +
        this.numberToLetter(decrypted[2]);

      steps.push({
        type: "calculation",
        content: `Inverse Matrix × Vector = [${decrypted.join(
          ", "
        )}] → "${decryptedTriplet}"`,
      });

      result += decryptedTriplet;
    }

    return { output: result, steps, inverse: inverseMatrix };
  }

  displayResults(operationType, input, output, steps, matrix, inverse = null) {
    const resultsSection = document.getElementById("results-section");
    const resultsContainer = document.getElementById("results-container");

    // Очищення placeholder і показ результатів
    resultsContainer.innerHTML = "";

    // Створення контенту результатів
    const resultsContent = document.createElement("div");
    resultsContent.className = "results-content active";

    // Заголовок з математичною нотацією
    const header = document.createElement("div");
    header.className = "result-header";
    const operationSymbol =
      operationType === "Encryption"
        ? "C = K × P (mod 26)"
        : "P = K⁻¹ × C (mod 26)";
    header.innerHTML = `
            <h3><i class="fas fa-${
              operationType === "Encryption" ? "lock" : "unlock"
            }"></i> ${operationType}</h3>
            <div class="math-formula${
              operationType === "Decryption" ? " decrypt" : ""
            }">${operationSymbol}</div>
        `;
    resultsContent.appendChild(header);

    // Фінальний результат з математичним представленням
    const finalResult = document.createElement("div");
    finalResult.className =
      operationType === "Decryption" ? "result-final decrypt" : "result-final";
    const resultLabel =
      operationType === "Encryption" ? "Ciphertext" : "Plaintext";
    finalResult.innerHTML = `
            <div style="margin-bottom: 8px; font-size: 0.9rem; opacity: 0.9;">${resultLabel}:</div>
            <div style="font-size: 1.2rem; font-weight: 700; font-family: 'Courier New', monospace;">${output}</div>
        `;
    resultsContent.appendChild(finalResult);

    // Кроки з математичною нотацією
    const stepsContainer = document.createElement("div");
    stepsContainer.className = "steps-container";

    steps.forEach((step, index) => {
      const stepElement = document.createElement("div");
      stepElement.className = `result-item ${step.type}${
        operationType === "Decryption" ? " decrypt" : ""
      }`;

      if (step.type === "matrix") {
        stepElement.innerHTML = `
                    <div class="step-title">${step.content}</div>
                    <div class="matrix-display${
                      operationType === "Decryption" ? " decrypt" : ""
                    }">
                        <div class="matrix-bracket">[</div>
                        <div class="matrix-content">
                            ${step.matrix
                              .map(
                                (row) =>
                                  `<div class="matrix-row">${row
                                    .map(
                                      (val) =>
                                        `<span class="matrix-element">${val
                                          .toString()
                                          .padStart(2, " ")}</span>`
                                    )
                                    .join("")}</div>`
                              )
                              .join("")}
                        </div>
                        <div class="matrix-bracket">]</div>
                    </div>
                `;
      } else if (step.type === "step") {
        // Відображення кроків з математичною нотацією
        const content = step.content.replace(
          /Block "(.+)" → \[(.+)\]/,
          'Block "$1" = [$2]'
        );
        stepElement.innerHTML = `<div class="step-number">Step ${Math.floor(
          index / 2
        )}:</div><div>${content}</div>`;
      } else if (step.type === "calculation") {
        // Відображення обчислень
        const content = step.content
          .replace(
            /Matrix × Vector/,
            operationType === "Encryption" ? "K × P" : "K⁻¹ × C"
          )
          .replace(/Inverse Matrix × Vector/, "K⁻¹ × C")
          .replace(/=/, "≡")
          .replace(/→/, "→");
        stepElement.innerHTML = `<div class="calculation">${content}</div>`;
      } else {
        stepElement.innerHTML = `<div>${step.content}</div>`;
      }

      stepsContainer.appendChild(stepElement);
    });

    resultsContent.appendChild(stepsContainer);
    resultsContainer.appendChild(resultsContent);

    // Додавання анімації
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }

  showError(message) {
    const resultsContainer = document.getElementById("results-container");
    resultsContainer.innerHTML = `
            <div class="error-message" style="
                color: var(--error);
                background: rgba(239, 68, 68, 0.1);
                padding: 16px;
                border-radius: 8px;
                border-left: 4px solid var(--error);
                text-align: center;
            ">
                <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                ${message}
            </div>
        `;
  }

  resetAll() {
    // Скидання текстового вводу
    document.getElementById("text-input").value = "VELES";

    // Скидання матриці до значень за замовчуванням
    const defaultMatrix = [
      [6, 24, 1],
      [13, 16, 10],
      [20, 17, 15],
    ];

    defaultMatrix.forEach((row, i) => {
      row.forEach((val, j) => {
        const cell = document.getElementById(`m${i}${j}`);
        cell.value = val;
        cell.classList.remove("error", "warning");
        cell.title = "Valid matrix value";
      });
    });

    // Скидання результатів
    const resultsContainer = document.getElementById("results-container");
    resultsContainer.innerHTML = `
            <div class="results-placeholder">
                <i class="fas fa-play-circle"></i>
                <p>Select an operation to see the results</p>
            </div>
        `;

    // Оновлення інтерфейсу
    this.updateCharCount();
    this.updateMatrixInfo();
  }

  // Криптографічні методи без змін
  mod(n, m) {
    return ((n % m) + m) % m;
  }

  extendedGCD(a, b) {
    if (a === 0) return [b, 0, 1];
    const [gcd, x1, y1] = this.extendedGCD(b % a, a);
    const x = y1 - Math.floor(b / a) * x1;
    const y = x1;
    return [gcd, x, y];
  }

  modInverse(a, m) {
    const [gcd, x] = this.extendedGCD(a, m);
    if (gcd !== 1) return null;
    return this.mod(x, m);
  }

  determinant3x3(matrix) {
    const a = matrix[0][0],
      b = matrix[0][1],
      c = matrix[0][2];
    const d = matrix[1][0],
      e = matrix[1][1],
      f = matrix[1][2];
    const g = matrix[2][0],
      h = matrix[2][1],
      i = matrix[2][2];

    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  }

  matrixInverse3x3(matrix) {
    const det = this.determinant3x3(matrix);
    const detMod = this.mod(det, 26);

    const detInv = this.modInverse(detMod, 26);
    if (detInv === null) {
      throw new Error("Matrix is not invertible mod 26");
    }

    const adj = [
      [
        this.mod(
          (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) * detInv,
          26
        ),
        this.mod(
          -(matrix[0][1] * matrix[2][2] - matrix[0][2] * matrix[2][1]) * detInv,
          26
        ),
        this.mod(
          (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) * detInv,
          26
        ),
      ],
      [
        this.mod(
          -(matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) * detInv,
          26
        ),
        this.mod(
          (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) * detInv,
          26
        ),
        this.mod(
          -(matrix[0][0] * matrix[1][2] - matrix[0][2] * matrix[1][0]) * detInv,
          26
        ),
      ],
      [
        this.mod(
          (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) * detInv,
          26
        ),
        this.mod(
          -(matrix[0][0] * matrix[2][1] - matrix[0][1] * matrix[2][0]) * detInv,
          26
        ),
        this.mod(
          (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) * detInv,
          26
        ),
      ],
    ];

    return adj;
  }

  matrixVectorMultiply(matrix, vector) {
    return [
      this.mod(
        matrix[0][0] * vector[0] +
          matrix[0][1] * vector[1] +
          matrix[0][2] * vector[2],
        26
      ),
      this.mod(
        matrix[1][0] * vector[0] +
          matrix[1][1] * vector[1] +
          matrix[1][2] * vector[2],
        26
      ),
      this.mod(
        matrix[2][0] * vector[0] +
          matrix[2][1] * vector[1] +
          matrix[2][2] * vector[2],
        26
      ),
    ];
  }

  letterToNumber(letter) {
    return letter.toUpperCase().charCodeAt(0) - 65;
  }

  numberToLetter(number) {
    return String.fromCharCode(number + 65);
  }

  getKeyMatrix() {
    const matrix = [];
    for (let i = 0; i < 3; i++) {
      matrix[i] = [];
      for (let j = 0; j < 3; j++) {
        const cellValue = document.getElementById(`m${i}${j}`).value;
        const parsedValue = parseInt(cellValue);

        // Перевірка на порожні поля або невалідні значення
        if (cellValue === "" || isNaN(parsedValue)) {
          throw new Error(
            `Matrix cell [${i + 1},${j + 1}] is empty or invalid`
          );
        }

        // Перевірка на значення поза межами 0-25
        if (parsedValue < 0 || parsedValue > 25) {
          throw new Error(
            `Matrix cell [${i + 1},${
              j + 1
            }] must be between 0-25 (current: ${parsedValue})`
          );
        }

        matrix[i][j] = parsedValue;
      }
    }
    return matrix;
  }

  validateMatrix(matrix) {
    // Спочатку перевіряємо валідність матриці
    try {
      // Перевірка всіх значень на діапазон (0-25)
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (isNaN(matrix[i][j]) || matrix[i][j] < 0 || matrix[i][j] > 25) {
            return false;
          }
        }
      }

      // Перевірка детермінанта та оборотності
      const det = this.determinant3x3(matrix);
      const detMod = this.mod(det, 26);
      const gcd = this.extendedGCD(detMod, 26)[0];
      return gcd === 1;
    } catch (error) {
      return false;
    }
  }

  prepareText(text) {
    let cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");
    while (cleanText.length % 3 !== 0) {
      cleanText += "Z";
    }
    return cleanText;
  }
}

// Ініціалізація додатку
document.addEventListener("DOMContentLoaded", () => {
  new HillCipher();
});
