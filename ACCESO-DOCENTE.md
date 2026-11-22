# Activar el editor de tarjetas y grupos

## Una vez, desde tu computadora

1. Entrá con la cuenta administradora a [crear la autorización en GitHub](https://github.com/settings/personal-access-tokens/new?name=Tarjetas+de+Didactica&target_name=didacticafda&contents=write). En **Repository access**, elegí **Only select repositories** y seleccioná solo **didacticafda/didacticafda**. En **Repository permissions**, comprobá **Contents → Read and write**. Elegí la fecha de vencimiento y copiá el token generado.
2. Abrí el archivo local **activar-docente.html** con Chrome o Edge. Pegá el token, escribí dos veces la clave que elegiste para el equipo docente y tocá **Generar archivo de acceso**. Este formulario funciona en tu computadora, incluso sin conexión.
3. Reemplazá **recursos-config.js** en la carpeta del sitio por el archivo descargado. Publicá los cambios del proyecto en **main** con el mismo método que ya usás. En GitHub Pages, la fuente de publicación debe incluir los archivos de la raíz de esa rama.
4. Cuando Pages termine, entrá por el candado **Acceso para Docentes** de la barra superior, en la portada o en Comisiones. Para comprobar la publicación, guardá una edición y revisá la portada en otra ventana después del despliegue.

## Para los profesores

Ingresá con el usuario y la clave compartidos. Usá **Agregar tarjeta**, el lápiz para editar o el botón rojo para eliminar. **Destacada** enciende el halo. Al guardar, GitHub registra el cambio y Pages actualiza la portada. En Comisiones, usá **Agregar grupo**, el lápiz o el botón rojo de la fila. El acceso se conserva al navegar entre las dos páginas en la misma pestaña. Tocá el candado abierto para terminar la edición.

## Alcance de la autorización

El sitio guarda las tarjetas en **recursos.json** y los grupos en **comisiones.json**. El permiso Contents de GitHub abarca el contenido del repositorio completo. Quien conoce la clave docente puede recuperar la autorización de GitHub desde su navegador y usar sus permisos fuera del editor. La copia cifrada es pública y admite intentos de adivinar la clave fuera de línea. Usá una clave larga, exclusiva de la cátedra, y compartila solo con quienes puedan tener ese nivel de acceso.

Cuando venza el token, repetí la activación con uno nuevo. Para retirar el acceso o cambiar la clave compartida, revocá el token anterior en GitHub y generá un archivo nuevo con otro token. Esto inutiliza también las copias antiguas del archivo cifrado. La rama main debe permitir que la cuenta propietaria del token actualice ambos archivos directamente.
