export async function accountExists(email: string): Promise<boolean> {
  await new Promise((resolve) => resolve(null))
  return false
}

export async function createAccount(email: string, password: string) {
  await new Promise((resolve) => resolve(null))
  return { id: 1 } // TODO
}
