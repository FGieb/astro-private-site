export const keyForToday = () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};
