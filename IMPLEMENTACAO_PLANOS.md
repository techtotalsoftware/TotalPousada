# 🚀 Implementaåııo do Sistema de Planos - TotalPousada

## ✅ Status da Implementaåııo

- [x] Enum TenantPlan criado
- [x] Feature access module criado
- [x] Middleware de proteåııo de rotas criado
- [x] Frontend enums e hooks criados
- [x] Migraåııo de banco criada
- [ ] Modificar Tenant.ts para usar validaåııo
- [ ] Adicionar validaåııo nas actions (expense, team, etc)
- [ ] Modificar frontend para esconder menu items
- [ ] Executar migraåııo no banco de dados
- [ ] Testar tudo

## 📁 Arquivos Criados

### Backend
- `backend/lib/plan-enum.ts` - Enum TenantPlan com validaåııo
- `backend/lib/feature-access.ts` - Mapeamento de features por plano
- `backend/lib/plan-middleware.ts` - Middleware para rotas API

### Frontend
- `frontend/lib/plan-enum-frontend.ts` - Enum para frontend
- `frontend/lib/feature-access-frontend.ts` - Hooks e helpers React

### Database
- `database/migration-plan.sql` - Scripts SQL para constraint

## 🎯 Estrutura de Planos

| Plano | Funcionalidades |
|-------|----------------|
| **Basic** | Reservas, Quartos, Calendáıırio, Hóıııspedes, Check-in/out |
| **Premium** | Basic + Finanåııas, Promoåııes, Add-ons, Galeria, Relatóıı´rios Báışicos |
| **Enterprise** | Premium + Geståııo de Equipe, Relatóıı´rios Avanåııdos, API Access, Automaåııo |

## 🔧 Prï¿½ximos Passos

### 1. Modificar Tenant.ts

Adicionar validaåııo no `backend/models/Tenant.ts`:

```typescript
import { TenantPlan, isValidPlan } from "../lib/plan-enum";

// No método create e updatePlan:
if (!isValidPlan(data.plan)) {
  throw new Error(
    `Plano inváıılido: ${data.plan}. Valores aceitos: ${Object.values(TenantPlan).join(", ")}`
  );
}
```

### 2. Adicionar Validaåııo nas Actions

Exemplo para `backend/actions/expense.ts`:

```typescript
import { Feature, ensureFeatureAccess } from "../lib/feature-access";
import { TenantPlan } from "../lib/plan-enum";

export async function createExpense(data: any, context: any) {
  const { tenant } = context;
  
  // Validaåııo: Finance é Premium
  ensureFeatureAccess(tenant.plan as TenantPlan, Feature.FINANCE);
  
  // ... resto do código
}
```

### 3. Modificar Frontend

No `frontend/app/dashboard/layout.tsx` ou componente de menu:

```tsx
import { useFeatureAccess } from "@/lib/feature-access-frontend";
import { TenantPlan } from "@/lib/plan-enum-frontend";

function Sidebar() {
  const { tenant } = useTenant();
  const featureAccess = useFeatureAccess(tenant?.plan as TenantPlan);

  return (
    <nav>
      {/* Sempre visíııvel - Basic */}
      <Link href="/dashboard/reservations">Reservas</Link>
      
      {/* Apenas Premium+ */}
      {featureAccess.canAccess(Feature.FINANCE) && (
        <Link href="/dashboard/finance">Finanåııas</Link>
      )}
      
      {/* Apenas Enterprise */}
      {featureAccess.canAccess(Feature.TEAM_MANAGEMENT) && (
        <Link href="/dashboard/team">Equipe</Link>
      )}
    </nav>
  );
}
```

### 4. Executar Migraåııo

```bash
# MySQL
mysql -u root -p totalpousada < database/migration-plan.sql

# Ou se usar Prisma
npx prisma migrate dev
```

### 5. Usar Middleware nas Rotas

Exemplo em `backend/routes/api.ts`:

```typescript
import { requireFeature } from "../lib/plan-middleware";
import { Feature } from "../lib/feature-access";

// Rotas de finanåııas (Premium)
router.post("/expenses", authenticate, requireFeature(Feature.FINANCE), createExpense);

// Rotas de equipe (Enterprise)
router.post("/team", authenticate, requireFeature(Feature.TEAM_MANAGEMENT), createTeam);
```

## 🧪 Testes

### Testar Validaåııo

```typescript
// Testar enum
import { isValidPlan, TenantPlan } from "./plan-enum";

isValidPlan("Basic");      // true
isValidPlan("Premium");    // true
isValidPlan("Invalid");    // false

// Testar feature access
import { hasFeatureAccess, Feature } from "./feature-access";

hasFeatureAccess(TenantPlan.BASIC, Feature.RESERVATIONS);  // true
hasFeatureAccess(TenantPlan.BASIC, Feature.FINANCE);       // false
hasFeatureAccess(TenantPlan.PREMIUM, Feature.FINANCE);     // true
```

## 🔒 Segurança

### Camadas de Validaåııo

1. **Banco de Dados**: Constraint CHECK ou ENUM
2. **Backend Model**: Validaåııo com `isValidPlan()`
3. **Actions**: Validaåııo com `ensureFeatureAccess()`
4. **Middleware**: `requireFeature()` em rotas API
5. **Frontend**: Menu condicional (apenas UX)

### Importante

- **Nunca confiar no frontend** - todas as validaåııes devem estar no backend
- **Sempre usar o enum** - nunca comparar strings diretamente
- **Middleware em rotas sensíııveis** - finance, team, etc

## 📝 Commits

```bash
git add .
git commit -m "feat: implement tenant plan access control (Basic/Premium/Enterprise)

- Add TenantPlan enum for type-safe plan validation
- Add feature-access module with feature requirements per plan
- Add middleware for API route protection
- Add frontend hooks for menu visibility control
- Add database migration for plan constraint
- Basic: reservations, rooms, calendar, guests, check-in/out
- Premium: +finance, promotions, addons, gallery, basic reports
- Enterprise: +team management, advanced reports, API access"
git push origin feature/tenant-plan-access-control
```

## 🆘 Troubleshooting

### Erro: "Plano inváıılido"
Verifique se o valor é exatamente `"Basic"`, `"Premium"`, ou `"Enterprise"` (case-sensitive).

### Erro: "Feature not available"
O tenant não tem acesso à feature. Verifique o plano do tenant e a tabela `FEATURE_REQUIREMENTS`.

### Constraint CHECK não funciona
Verifique se seu MySQL é 8.0+ (versÃµes antigas ignoram CHECK). Para PostgreSQL, use ENUM.

---

**Branch**: `feature/tenant-plan-access-control`

**Status**: Em implementaåııo ⏳
