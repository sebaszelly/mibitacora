// La interfaz se construye después de elegir la dirección visual.
// Por ahora solo se abre la base de datos y se cargan los hábitos iniciales.
import { ensureSeeded } from './db/seed';

void ensureSeeded();
