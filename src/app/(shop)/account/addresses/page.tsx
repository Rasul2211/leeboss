import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { AddressBook } from '@/components/account/AddressBook';

export default async function AddressesPage() {
  const user = await requireUser('/account/addresses');

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { city: 'asc' }],
  });

  return <AddressBook addresses={addresses} />;
}
