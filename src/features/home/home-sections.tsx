import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { cn } from 'cn'
import { useCart } from '@/features/cart/cart-state'
import { useSession } from '@/features/account/use-session'
import { KurioButton, kurioButtonClass } from '@/features/home/kurio-ui'

const heroImage = '/figma/hero.png'
const promoImages = ['/figma/promo-a.png', '/figma/promo-b.png']
const journalImages = ['/figma/journal-1.png', '/figma/journal-2.png', '/figma/journal-3.png', '/figma/journal-4.png']
const socialLinks = [
  { src: '/icons/facebook.svg', label: 'Facebook' },
  { src: '/icons/instagram.svg', label: 'Instagram' },
  { src: '/icons/twitter.svg', label: 'Twitter' },
  { src: '/icons/linkedin.svg', label: 'LinkedIn' },
  { src: '/icons/youtube.svg', label: 'YouTube' },
]

export function HomeHeader({
  query,
  onSearch,
  active = 'inicio',
}: {
  query: string
  onSearch: (q: string | undefined) => void
  active?: 'inicio' | 'mercado'
}) {
  const session = useSession()
  const cart = useCart()
  const count = cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const [open, setOpen] = useState(Boolean(query))
  const [draft, setDraft] = useState(query)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(draft.trim() || undefined)
  }

  return (
    <header className="flex w-full flex-col">
      <div className="flex min-h-[44px] w-full flex-wrap items-start justify-between gap-6">
        <Link to="/" className="w-[160px] shrink-0 pt-2 text-sm leading-[18px] font-bold tracking-[0.1em] text-[var(--kurio-fg)]">
          KURIO
        </Link>
        <nav aria-label="Principal" className="flex min-w-0 flex-wrap items-start gap-x-6 gap-y-3 lg:gap-10">
          <HeaderNavItem to="/" active={active === 'inicio'}>
            Início
          </HeaderNavItem>
          <HeaderNavItem to="/" hash="mercado" active={active === 'mercado'}>
            Mercado
          </HeaderNavItem>
          <HeaderNavItem to="/" hash="diario" active={false}>
            Criadores
          </HeaderNavItem>
          <HeaderNavItem to="/" hash="diario" active={false}>
            Aprenda
          </HeaderNavItem>
        </nav>
        <div className="flex items-center gap-7">
          <button
            type="button"
            className="text-[var(--kurio-fg)]"
            aria-expanded={open}
            aria-controls="catalog-search-panel"
            onClick={() => setOpen((current) => !current)}
          >
            <span className="sr-only">Buscar</span>
            <img src="/icons/search.svg" alt="" width={20} height={20} className="size-5" />
          </button>
          <Link to="/cart" className="relative inline-flex h-6 w-8 items-center text-[var(--kurio-fg)]" aria-label={`Carrinho, ${count} itens`}>
            <img src="/icons/cart.svg" alt="" width={24} height={24} className="size-6" />
            <span className="absolute -top-1 left-4 flex size-4 items-center justify-center rounded-full border-2 border-[var(--kurio-ink)] bg-[var(--kurio-primary)] text-[10px] leading-[13px] font-medium text-[var(--kurio-ink)]">
              {count}
            </span>
          </Link>
          {session.status === 'authenticated' ? (
            <Link
              to="/profile"
              className={cn(kurioButtonClass, 'h-[35px] px-3 text-base leading-[21px] font-medium')}
            >
              {session.user.name}
            </Link>
          ) : (
            <Link
              to="/login"
              className={cn(kurioButtonClass, 'h-[35px] w-[100px] gap-1 text-base leading-[21px] font-medium')}
            >
              <DoorIcon />
              Entrar
            </Link>
          )}
        </div>
      </div>
      {open ? (
        <form id="catalog-search-panel" className="my-4 flex w-full max-w-md items-center gap-2" role="search" onSubmit={submit}>
          <label htmlFor="catalog-search" className="sr-only">
            Buscar
          </label>
          <input
            id="catalog-search"
            value={draft}
            placeholder="Título, artista ou coleção"
            onChange={(event) => setDraft(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-[var(--kurio-radius)] border border-[var(--kurio-border)] bg-[var(--kurio-dark)] px-3 text-sm text-[var(--kurio-fg)] outline-none focus-visible:border-[var(--kurio-primary)]"
          />
          <KurioButton type="submit" className="h-10 px-4 text-sm font-bold">
            Buscar
          </KurioButton>
        </form>
      ) : null}
      <div className="h-px w-full bg-[var(--kurio-primary)]" />
    </header>
  )
}

export function HomeHero() {
  return (
    <section className="flex h-[450px] w-full items-center pl-0 lg:pl-10" aria-labelledby="hero-titulo">
      <div className="flex w-full flex-col items-start gap-11 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
        <div className="relative flex w-[600px] max-w-[600px] shrink-0 flex-col items-start gap-5 lg:-translate-y-6">
          <div className="flex flex-col gap-1">
            <p className="text-sm leading-4 font-medium tracking-[0.1em]">Bem-vindo à Kurio</p>
            <h1 id="hero-titulo" className="max-w-full text-[28px] leading-[42px] font-medium lg:max-w-[600px] lg:text-[43px] lg:leading-[70px]">
              SEJA DONO DO FUTURO
              <br className="hidden lg:inline" /> DA ARTE DIGITAL
            </h1>
          </div>
          <p className="max-w-[557px] text-sm leading-6 text-[var(--kurio-secondary)]">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
          </p>
          <a
            href="#mercado"
            className={cn(kurioButtonClass, 'h-10 px-7 text-base leading-5 font-bold')}
          >
            EXPLORAR
          </a>
          <div className="absolute right-0 -bottom-[52px] flex gap-2" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="size-2 rounded-full bg-[var(--kurio-primary)]" />
            ))}
          </div>
        </div>
        <div className="w-full max-w-[450px] shrink">
          <img
            src={heroImage}
            alt="Macaco de óculos escuros e jaqueta verde"
            width={450}
            height={450}
            fetchPriority="high"
            className="h-[450px] w-full rounded-[24px] object-cover"
          />
        </div>
      </div>
    </section>
  )
}

export function HomePromos() {
  return (
    <section className="grid w-full gap-7 lg:grid-cols-2" aria-label="Chamadas">
      <PromoCard
        image={promoImages[0]}
        title="Lançamentos gênesis de edição limitada"
        text="Colecione edições escassas diretamente dos criadores antes da revelação pública."
      />
      <PromoCard
        image={promoImages[1]}
        title="Arte digital selecionada e muito mais"
        text="Explore novos artistas, coleções verificadas e obras digitais que definem a cultura."
      />
    </section>
  )
}

function PromoCard({ image, title, text }: { image: string; title: string; text: string }) {
  return (
    <article className="relative h-[250px] overflow-hidden rounded-[8px] bg-[var(--kurio-card)]">
      <img src={image} alt="" className="h-[180px] w-full object-cover sm:absolute sm:top-0 sm:left-0 sm:h-full sm:w-[292px] sm:rounded-[18px]" />
      <div className="relative flex flex-1 flex-col items-center justify-center h-full gap-0 px-4 py-6 text-center sm:ml-[292px]">
        <h2 className="max-w-full text-lg leading-6 font-bold">{title}</h2>
        <p className="mt-3 max-w-[230px] text-sm leading-6 text-[var(--kurio-secondary)]">{text}</p>
        <a
          href="#mercado"
          className={cn(kurioButtonClass, 'mt-auto h-10 shrink-0 self-end gap-2 px-4 text-sm leading-5 font-medium')}
        >
          Explorar
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  )
}

const posts = [
  {
    image: journalImages[0],
    meta: '12 de setembro | Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
  },
  {
    image: journalImages[1],
    meta: '13 de setembro | Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
  },
  {
    image: journalImages[2],
    meta: '15 de setembro | Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
  },
  {
    image: journalImages[3],
    meta: '15 de setembro | Leitura de 2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
  },
]

export function HomeJournal() {
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <section id="diario" className="flex w-full flex-col items-center gap-10" aria-labelledby="diario-titulo">
      <div className="flex w-full flex-col items-center gap-3 text-center">
        <h2 id="diario-titulo" className="text-[28px] leading-[37px] font-bold">
          Diário da Cunhagem
        </h2>
        <p className="text-sm leading-[18px] text-[var(--kurio-secondary)]">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </div>
      <div className="grid w-full gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {posts.map((post) => (
          <article key={post.title} className="flex min-h-[369px] flex-col overflow-hidden rounded-[8px] bg-[var(--kurio-card)]">
            <img src={post.image} alt="" className="h-[195px] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
              <p className="text-xs leading-4 font-medium text-[var(--kurio-secondary)]">{post.meta}</p>
              <h3 className="text-base leading-[21px] font-bold">{post.title}</h3>
              <p className="text-xs leading-4 font-medium text-[var(--kurio-secondary)]">{post.text}</p>
              <button
                type="button"
                className="mt-auto w-fit pt-1 text-xs leading-4 font-bold text-[var(--kurio-accent)]"
                onClick={() => setNotice('Este texto faz parte da vitrine e não abre um artigo separado.')}
              >
                Ler mais →
              </button>
            </div>
          </article>
        ))}
      </div>
      {notice ? (
        <p role="status" className="text-sm text-[var(--kurio-secondary)]">
          {notice}
        </p>
      ) : null}
    </section>
  )
}

export function HomeFooter() {
  const [sent, setSent] = useState(false)

  return (
    <footer className="flex w-full flex-col">
      <div className="flex flex-col gap-3 bg-[var(--kurio-card)] p-8 lg:min-h-[250px] lg:pb-4">
        <div className="grid gap-7 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.35fr)] lg:gap-0 lg:divide-x lg:divide-[var(--kurio-primary)]">
          <ServiceMark letter="W" title="Segurança da carteira" text="Proteja sua carteira e colecione arte digital verificada com confiança." />
          <ServiceMark letter="C" title="Criadores em destaque" text="Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede." className="lg:px-4" />
          <ServiceMark letter="D" title="Alertas de lançamentos" text="Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado." className="lg:px-4" />
          <form
            className="flex flex-col gap-4 lg:px-4"
            onSubmit={(event) => {
              event.preventDefault()
              setSent(true)
            }}
          >
            <h2 className="text-lg leading-4 font-bold">Antecipe-se ao próximo lançamento</h2>
            <div className="flex h-10 items-center rounded-[var(--kurio-radius)] bg-[var(--kurio-dark)] shadow-[0_0_20px_rgba(10,6,4,0.45)]">
              <label htmlFor="kurio-news" className="sr-only">
                E-mail para os lançamentos
              </label>
              <input
                id="kurio-news"
                type="email"
                required
                placeholder="digite seu e-mail..."
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--kurio-fg)] outline-none placeholder:text-[var(--kurio-muted)]"
              />
              <KurioButton type="submit" className="h-full rounded-none rounded-r-[var(--kurio-radius)] px-4 text-lg leading-4 font-bold">
                Enviar
              </KurioButton>
            </div>
            <p className="text-[13px] leading-[22px] text-[var(--kurio-secondary)]">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
            {sent ? (
              <p role="status" className="text-sm">
                A lista de lançamentos ainda não envia e-mail.
              </p>
            ) : null}
          </form>
        </div>
      </div>
      <div className="grid items-center gap-6 bg-[var(--kurio-dark)] px-8 py-8 text-sm leading-[22px] lg:h-[88px] lg:py-0 lg:grid-cols-[repeat(3,minmax(0,1fr))_228px] lg:gap-[92px]">
        <p className="font-bold tracking-[0.1em]">KURIO</p>
        <p className="lg:w-[219px]">Feito para colecionadores,<br />criadores e cultura</p>
        <p>contato@email.com</p>
        <p>+55 11 4002 8922</p>
      </div>
      <div className="bg-[var(--kurio-card)] px-8 py-8 lg:h-[236px]">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_228px] xl:gap-[124px]">
          <FooterColumn title="Meu perfil" lines={['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse']} />
          <FooterColumn title="Central de ajuda" lines={['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item']} />
          <FooterColumn title="Coleções" lines={['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade']} />
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-lg leading-4 font-bold">Redes sociais</h2>
              <div className="mt-5 flex gap-2.5">
                {socialLinks.map((item) => (
                  <img key={item.label} src={item.src} alt={item.label} width={30} height={30} className="size-[30px]" />
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-lg leading-4 font-bold">Carteiras compatíveis</h2>
              <p className="mt-3 rounded-[var(--kurio-radius)] border border-[var(--kurio-border-soft)] bg-[var(--kurio-dark)] px-2 py-[6px] text-[9px] leading-3 font-bold tracking-[0.1px] text-[var(--kurio-accent)]">
                METAMASK · WALLETCONNECT · COINBASE
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="pt-[6px] text-center text-sm leading-[30px]">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

function ServiceMark({ letter, title, text, className }: { letter: string; title: string; text: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 lg:px-4', className)}>
      <span className="flex size-[74px] items-center justify-center rounded-full bg-[var(--kurio-primary)] text-2xl leading-8 font-bold text-[var(--kurio-ink)]">
        {letter}
      </span>
      <h2 className="text-[17px] leading-4 font-bold">{title}</h2>
      <p className="max-w-[204px] text-sm leading-[22px] text-[var(--kurio-secondary)]">{text}</p>
    </div>
  )
}

function FooterColumn({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div>
      <h2 className="text-lg leading-4 font-bold">{title}</h2>
      <ul className="mt-2 text-sm leading-[30px]">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}

function HeaderNavItem({
  to,
  hash,
  active,
  children,
}: {
  to: '/'
  hash?: string
  active: boolean
  children: string
}) {
  return (
    <Link
      to={to}
      hash={hash}
      hashScrollIntoView={{ behavior: 'instant', block: 'start' }}
      onClick={(event) => {
        if (hash && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && window.location.pathname === to && window.location.hash === `#${hash}`) {
          event.preventDefault()
          document.getElementById(hash)?.scrollIntoView({ block: 'start' })
        }
      }}
      className={
        active
          ? 'relative flex h-11 flex-col text-base leading-[21px] font-bold text-[var(--kurio-accent)]'
          : 'text-base leading-[21px] text-[var(--kurio-fg)]'
      }
    >
      {children}
      {active ? <span className="absolute right-0 bottom-0 left-0 h-0 border-b-[3px] border-[var(--kurio-primary)]" /> : null}
    </Link>
  )
}

function DoorIcon() {
  return (
    <svg viewBox="9 8 20 18" className="size-5" fill="none" aria-hidden="true">
      <path d="M27.1592 17.1006H17.125" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24.7202 14.6706L27.1602 17.1006L24.7202 19.5306" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M22.6332 13.3583C22.3582 10.3749 21.2415 9.29158 16.7998 9.29158C10.8823 9.29158 10.8823 11.2166 10.8823 16.9999C10.8823 22.7833 10.8823 24.7083 16.7998 24.7083C21.2415 24.7083 22.3582 23.6249 22.6332 20.6416"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
