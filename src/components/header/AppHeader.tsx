import { Icon } from "@/ui/Icon"
import { Button } from "@/ui/Button"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-background-dark/95 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <Icon name="leaderboard" className="text-white text-lg" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            Premium Tier
          </h1>
        </div>

        <nav
          className="hidden md:flex items-center gap-6"
          aria-label="Primary navigation"
        >
          {["Мой лист", "Сообщество", "Шаблоны"].map(label => (
            <a
              key={label}
              href="#"
              className="text-sm font-medium text-gray-300 hover:text-primary transition"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button className="hidden md:inline-flex">
            <Icon name="visibility" className="text-lg" />
            Preview
          </Button>

          <div
            className="size-9 rounded-full ring-2 ring-surface-border bg-cover bg-center"
            aria-label="User profile"
            role="img"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuALtODD1RCi3YBavn0Gk6bio-jFfkU2Jej2owWayY2R5vufCZnbl0CxHN2-1JJ9J61y_VKAtY_3rZZhfuIxCyoTDNBhAucwcJZdXAxhAsnIdP1eUUIjSeDh89wZIYw7KvT4McXb0LSMeGvkJZACBcuSVtvDwS1hahp8nQQEMTwEt2REAeV7Rc-bLOACo9LeF7SXme0Kw2w7709CfwHG1bL4ORkK2-KQ7VN8gDUYLCWZGdhaXkSPFDPs_EvB_kHLggq8lL27HZ2c9g")',
            }}
          />
        </div>
      </div>
    </header>
  )
}
