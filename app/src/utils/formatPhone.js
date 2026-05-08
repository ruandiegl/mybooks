export function formatPhone(value) {
    // Remove tudo que não for número
    const onlyNums = value.replace(/\D/g, "");

    // Aplica a máscara (xx) xxxxx-xxxx
    if (onlyNums.length <= 2) {
      return `(${onlyNums}`;
    }
    if (onlyNums.length <= 7) {
      return `(${onlyNums.slice(0, 2)}) ${onlyNums.slice(2)}`;
    }
    return `(${onlyNums.slice(0, 2)}) ${onlyNums.slice(2, 7)}-${onlyNums.slice(7, 11)}`;
  }