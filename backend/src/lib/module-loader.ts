import { createLogger } from "./logger.js"

const logger = createLogger("ModuleLoader", { color: "cyan" })

interface ModuleRegistration {
  name: string
  seed: () => Promise<void>
}

const modules = new Map<string, ModuleRegistration>()

export function registerModule(name: string, seed: () => Promise<void>) {
  if (modules.has(name)) {
    logger.warn(`Модуль "${name}" уже зарегистрирован`)
    return
  }
  modules.set(name, { name, seed })
  logger.debug(`Модуль "${name}" зарегистрирован`)
}

export async function seedAllModules() {
  for (const [name, mod] of modules) {
    try {
      await mod.seed()
      logger.info(`Модуль "${name}" инициализирован`)
    } catch (err) {
      logger.error(err as Error, { module: name, message: `Ошибка инициализации модуля "${name}"` })
      throw err
    }
  }
}
