export const walletFixtures = [
  {
    id: 'wal_marina_principal',
    userId: 'usr_marina_costa', displayName: 'Marina Costa', profileName: 'marina.costa', email: 'marina.costa@greenmint.test', ens: 'marina.eth', referral: 'KURIO', network: 'Ethereum', provider: 'MetaMask',
    label: 'Principal',
    role: 'primary' as const,
    address: '0xA91F00000000000000000000000000000000E82C',
    connectedNetwork: null,
  },
  {
    id: 'wal_marina_reserva',
    userId: 'usr_marina_costa', displayName: 'Marina Costa', profileName: 'marina.costa', email: 'marina.costa@greenmint.test', ens: 'marina.eth', referral: 'KURIO', network: 'Ethereum', provider: 'MetaMask',
    label: 'Reserva',
    role: 'secondary' as const,
    address: 'nova.kurio.eth',
    connectedNetwork: null,
  },
  {
    id: 'wal_rafael_principal',
    userId: 'usr_rafael_nunes', displayName: 'Rafael Nunes', profileName: 'rafael.nunes', email: 'rafael.nunes@greenmint.test', ens: 'rafael.eth', referral: 'KURIO', network: 'Ethereum', provider: 'MetaMask',
    label: 'Principal',
    role: 'primary' as const,
    address: '0xB0020000000000000000000000000000000044B2',
    connectedNetwork: null,
  },
]
