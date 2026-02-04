export interface ValidationErrors {
  [key: string]: string | undefined;
}

export function validateAmount(value: string): string | undefined {
  if (!value || value.trim() === '') {
    return 'Сумма обязательна';
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return 'Некорректная сумма';
  }
  if (num <= 0) {
    return 'Сумма должна быть больше нуля';
  }
  return undefined;
}

export function validateRequired(value: string, fieldName: string): string | undefined {
  if (!value || value.trim() === '') {
    return `${fieldName} обязательно`;
  }
  return undefined;
}

export function validateDate(value: string): string | undefined {
  if (!value) {
    return 'Дата обязательна';
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return 'Некорректная дата';
  }
  return undefined;
}

export function validatePositiveNumber(value: string, fieldName: string): string | undefined {
  if (!value || value.trim() === '') {
    return `${fieldName} обязательно`;
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return `Некорректное значение`;
  }
  if (num <= 0) {
    return `${fieldName} должно быть больше нуля`;
  }
  return undefined;
}

export function validatePercentage(value: string): string | undefined {
  if (!value) return undefined;
  const num = parseFloat(value);
  if (isNaN(num)) {
    return 'Некорректное значение';
  }
  if (num < 1 || num > 100) {
    return 'Значение должно быть от 1 до 100';
  }
  return undefined;
}

export function validateDayOfMonth(value: string): string | undefined {
  if (!value) return undefined;
  const num = parseInt(value);
  if (isNaN(num)) {
    return 'Некорректное значение';
  }
  if (num < 1 || num > 31) {
    return 'День должен быть от 1 до 31';
  }
  return undefined;
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.values(errors).some(error => error !== undefined);
}
