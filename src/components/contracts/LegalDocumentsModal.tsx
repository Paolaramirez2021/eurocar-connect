import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield } from "lucide-react";

interface LegalDocumentsModalProps {
  type: "terms" | "privacy";
  trigger: React.ReactNode;
}

export const TERMINOS_CONDICIONES = `TERMINOS Y CONDICIONES EUROCAR RENTAL SAS

legalmente constituida en Colombia, ubicada en la Cl 26 69 C 03 Local 105 ofrece a través de diferentes canales de ventas, página web www.Eurocarrental.com, WhatsApp, líneas telefónicas y en forma física en nuestras oficinas. Ofrece servicios de alquiler de vehículos y cuenta con Registro Nacional de Turismo. El usuario en la utilización de nuestras plataformas acepta la totalidad de condiciones que estén vigentes al momento de utilizar estos medios para obtener información o generar reservas, y teniendo en cuenta la política de tratamiento de datos. Los vehículos ofrecidos en nuestras plataformas podrán ser cambiados, actualizados, en sus modelos, colores y valores de renta, por lo que es responsabilidad del usuario realizar el análisis de la información una vez se publique por parte de EUROCAR. Además, nuestra empresa no será responsable del mal uso que pueda realizar el usuario de nuestras plataformas ante terceros ni ellos mismos.

POLITICAS DE RESERVA

1. La reserva la podrá realizar por nuestra página web www.Eurocarrental.com, por vía telefónica, vía whatsaap, o presencial en nuestras oficinas.

2. El valor de la reserva no podrá ser menor al 30% del valor total del servicio.

3. El pago de la reserva se podrá realizar en nuestra pasarela de pagos la cual interconecta con WOMPI producto BANCOLOMBIA es quien provee las medidas tecnológicas de seguridad, acepta, autoriza y valida cada pago. También podrá pagar por transferencia bancaria, QR, BREB y otras opciones más.

4. Deberá diligenciar formulario virtual o físico en nuestras oficinas y adjuntar la documentación solicitada.

5. Si Usted no se presenta a utilizar su reserva en la fecha y horarios indicados (o llega con retraso) se configura lo que en el mercado turístico se conoce como No Show, por lo tanto, no se devolverá el valor de la reserva del 30% del valor del servicio, si realizo un pago mayor a este porcentaje, lo que exceda podrá hacerlo efectivo con un bono valido para redimir en máximo 6 meses con servicios de alquiler de vehículos de nuestra empresa.

Todas las reservas y transacciones realizadas están sujetas a la aceptación de Eurocar rental sas, la cual se da con absoluta discrecionalidad. Sin limitaciones, esto significa que Eurocar puede negarse a aceptar o puede cancelar cualquier reserva o transacción, hayan sido estas confirmadas o no, pagadas o no, con o sin causa, a nuestra exclusiva discreción y sin responsabilidad quien reserva o cualquier otro tercero.

6. El cliente deberá presentar en nuestras oficinas documentación en original
   a. Documenta de identificación (cedula ciudadanía, extranjería, permiso permanente o pasaporte.
   b. Tarjeta de crédito de la persona que tomara el servicio como garantía con cupo disponible de acuerdo a la información brindada.

7. Cuando usted reserva un vehículo está realizando una reserva para una clase de Autos, por lo tanto, la rentadora garantiza el tamaño y capacidad del Auto (similares), sin embargo, la marca y modelo de los vehículos están sujetos a disponibilidad y ubicación.

8. El cliente asumirá los gastos adicionales que se generen en el tiempo del alquiler multas, comparendos o inmovilizaciones y demás aclarados en el contrato de arrendamiento.

9. Al firmar el contrato para la toma del servicio con firma digital, huella y foto el cliente confirma la aceptación de términos y condiciones detallados en estas políticas y en el cuerpo del contrato.

Se advierte al turista que la explotación, la pornografía y el abuso sexual de menores de edad en el país son sancionados penal y administrativamente conforme a las leyes vigentes, artículo 17 de la ley 679 de 2001 y adiciones en ley 1336 del 21 de Julio de 2009.

Estos Términos y Condiciones fueron actualizados el 4 de diciembre de 2025.

EUROCAR RENTAL SAS se reserva el derecho, a su sola discreción, de modificar, alterar o de otra manera actualizar, estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigencia desde el momento que se indique; en su defecto, se entenderá que su aplicación es inmediata. Usando esta Plataforma después de publicadas las modificaciones, Usted acepta estar sujeto a dichas modificaciones, alteraciones o actualizaciones de las Condiciones de Compra, sin derecho a efectuar reclamo alguno con relación a ello.`;

export const POLITICA_DATOS = `POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES DE EUROCAR RENTAL SAS

De conformidad con la Ley Estatutaria 1581 de 2012 y define en el decreto reglamentario 1074 de mayo 26 de 2015 en su capítulo 24 y 25 el cual tiene por objeto dictar las disposiciones generales para la protección de datos personales y desarrollar el derecho constitucional que tienen todas las personas a conocer, actualizar y rectificar las informaciones que se hayan recogido sobre ellas en bases de datos o archivos, así como el derecho a la información.

En virtud de lo anterior, dentro del deber legal y corporativo de EUROCAR RENTAL SAS ha diseñado la presente política de manejo de la información de carácter personal y bases de datos para todos los clientes, proveedores, y terceros de quien ha obtenido legalmente información y datos personales.

DEFINICIONES

Para entender mejor este documento compartimos el siguiente glosario.

1. Autorización: consentimiento que, de manera previa, expresa e informada emite el titular de algún dato personal para que la compañía lleve a cabo el tratamiento de sus datos personales.

2. Titular: persona natural cuyos datos son objeto de tratamiento por parte de la compañía.

3. Base de datos: conjunto de datos personales.

4. Canales de venta: se refiere a la plataforma, whatsapp, red social y/o local comercial.

5. Dato personal: información que está vinculada a una persona. Es cualquier pieza de información vinculada a una o varias personas determinadas o determinables o que puedan asociarse con una persona natural o jurídica. Los datos personales pueden ser públicos, semiprivados o privados.

6. Tratamiento: cualquier operación o conjunto de operaciones sobre datos personales dentro de las cuales se puede incluir su recolección, almacenamiento, uso, circulación o supresión.

7. Encargado del tratamiento: persona natural o jurídica, pública o privada, que por sí misma o en asocio con otros, realiza algún tratamiento sobre datos personales por cuenta del responsable del tratamiento.

8. Responsable del tratamiento: persona natural o jurídica, pública o privada, que por sí misma o en asocio con otros, decida sobre la base de datos y/o el tratamiento de los datos.

9. Dato privado: Es el dato que por su naturaleza íntima o reservada sólo es relevante para el titular.

10. Dato semiprivado: Es semiprivado el dato que no tiene naturaleza íntima, reservada, ni pública y cuyo conocimiento o divulgación puede interesar no sólo a su titular sino a cierto sector o grupo de personas o a la sociedad en general, como el dato financiero y crediticio de actividad comercial.

11. Dato público: Es aquel dato calificado como tal según los mandatos de la ley o de la Constitución Política. Son públicos, entre otros, los datos contenidos en documentos públicos, sentencias judiciales ejecutoriadas que no estén sometidas a reserva y los relativos al estado civil de las personas.

12. Dato sensible: aquellos relacionados con el origen racial o étnico, la pertenencia a sindicatos, organizaciones sociales o de derechos humanos, convicciones políticas, religiosas, de la vida sexual, biométricos o datos de la salud. Esta información podrá no ser otorgada por el Titular de estos datos.

13. Aviso de privacidad: documento físico, electrónico generado por el responsable del tratamiento que es puesto a disposición del titular con la información relativa a la existencia de las políticas de tratamiento de información que le serán aplicables, forma de acceder a las mismas y las características del Tratamiento que se pretende dar a los datos personales.

CUANDO Y QUE DATOS PERSONALES RECOLECTAMOS

1. Cuando los Titulares visitan nuestra Plataforma y se registran como usuarios.

2. Cuando los Titulares brindan Datos Personales de forma voluntaria, por ejemplo, al diligenciar formularios, fichas o contratos ya sean estos físicos o en medio digitales.

3. Cuando los Titulares usan los Servicios a través de cualquiera de los Canales de Venta.

4. Cuando los Titulares realizan alguna reserva a través de cualquiera de los Canales de Venta.

5. Cuando los titulares toman un servicio de alquiler y este firma un contrato o es facturado electrónicamente.

Información recolectada.

Podremos pedir o recolectar, salvo las excepciones relacionadas con Datos Sensibles o datos de niños, niñas y adolescentes, los datos que sean necesarios para cumplir la finalidad, los cuales son los siguientes:

1. Datos Personales generales: nombre y apellidos, nacionalidad, edad, estado civil, número de identificación, fecha y lugar de nacimiento, dirección de correspondencia y ciudad de domicilio, teléfono de contacto, celular, redes sociales, correo electrónico, sexo, Datos Personales que reciba de terceros entre ellos centrales de información financiera, comercial y crediticia.
Al firmar contrato huella, foto y firma para efectos de validación de identidad y requisitos mínimos para reclamaciones por parte de las aseguradoras.

2. Otros Datos Personales: También recolectaremos historial de navegación en la Plataforma, historial de casos abiertos con servicio al cliente, direcciones de IP, y otros parámetros relacionados con el sistema operativo y el entorno informático del cliente y cualquier otro dato que fuere necesario para lograr las finalidades descritas en la Política.

3. Datos de tarjetas: información sobre tu tarjeta de débito o crédito (tal como el número de la tarjeta de crédito, el código de seguridad, el nombre del titular de la misma y su fecha de vencimiento).

Datos Personales Sensibles y su Tratamiento.

Sólo recopilará y tratará Datos Sensibles en los casos permitidos por la ley. En estos casos, te informaremos que no estás obligado a suministrar Datos Sensibles o a autorizar su Tratamiento. Si no estuvieras en disposición de autorizar el Tratamiento de tus Datos Sensibles, en algunos casos, no se podrá continuar con el proceso de validación de identidad, y por ende no será posible continuar con los Servicios, lo cual informaremos oportunamente. Si da la autorización para tratar tus Datos Sensibles, los recopilaremos y trataremos únicamente para las finalidades descritas en esta Política.

Datos Personales relacionados con menores de edad.

No tomaremos datos de menores de edad.

CASOS EN LOS CUALES, NO REQUIERE AUTORIZACIÓN PARA EL TRATAMIENTO DE LOS DATOS QUE TENGA EN SU PODER

1. Cuando la información sea solicitada a la compañía por una entidad pública o administrativa que esté actuando en ejercicio de sus funciones legales o por orden judicial.

2. Cuando se trate de datos de naturaleza pública debido a que éstos no son protegidos por el ámbito de aplicación de la norma.

3. Eventos de urgencia médica o sanitaria debidamente comprobadas.

4. En aquellos eventos donde la información sea autorizada por la ley para cumplir con fines históricos, estadísticos y científicos.

5. Cuando se trate de datos relacionados con el registro civil de las personas debido a que esta información no es considerada como un dato de naturaleza privada.

A QUIENES SE LES PUEDE ENTREGAR INFORMACIÓN SIN NECESIDAD DE CONTAR CON AUTORIZACIÓN DE LOS TITULARES DE LOS DATOS

1. A los titulares de los datos, sus herederos o representantes comprobados en cualquier momento y a través de cualquier medio cuando así lo soliciten.

2. A las entidades judiciales o administrativas en ejercicio de funciones que eleven algún requerimiento a la compañía para que le sea entregada la información.

3. A los terceros que sean autorizados por alguna ley de la república de Colombia.

4. A los terceros a los que el Titular del dato autorice expresamente entregar la información y cuya autorización sea entregada a EUROCAR RENTAL SAS

DERECHOS DE LOS TITULARES

1. Derecho a conocer, actualizar, rectificar, consultar sus datos personales en cualquier momento respecto a los datos que considere parciales, inexactos, incompletos, fraccionados y aquellos que induzcan a error.

2. Derecho a Solicitar prueba de la Autorización otorgada, salvo que se trate de uno de los casos en los que no es necesaria la autorización, de acuerdo con el artículo 10 de la ley 1581 de 2012.

3. Derecho a ser informado, previa solicitud, respecto del uso que se le ha dado a tus Datos Personales.

4. Derecho a presentar ante la Superintendencia de Industria y Comercio las quejas que considere pertinentes para hacer valer su derecho al Habeas Data frente a la compañía.

5. Derecho a revocar la autorización y/o solicitar la supresión tus Datos Personales.

6. Derecho a acceder en forma gratuita a los Datos Personales que hayan sido objeto de Tratamiento.

DEBERES RESPECTO A LOS TITULARES DE LOS DATOS

EUROCAR RENTAL SAS reconoce que los datos personales son propiedad de los titulares de los mismos y que únicamente tales personas podrán decidir sobre éstos. En este sentido, hará uso exclusivo para aquellas finalidades para las que sea facultado en los términos de la ley y en aras de lo anterior se permite informar los deberes que asume en su calidad de responsable del tratamiento:

1. La compañía deberá buscar el medio a través del cual obtener la autorización expresa por parte del titular de los datos para realizar cualquier tipo de tratamiento.

2. La compañía deberá informar de manera clara y expresa a sus clientes, empleados, proveedores y terceros en general de quienes obtenga bases de datos el tratamiento al cual serán sometidos los mismos y la finalidad de dicho tratamiento. Para ello, la compañía deberá diseñar la estrategia a través de la cual para cada evento, mecánica o solicitud de datos que se realice, informará a los mismos el respectivo tratamiento de que se trate.
Algunos de estos medios puede ser, diligenciamiento de formatos físicos, entre otros.

3. La compañía debe informar a los titulares de los datos para cada caso, el carácter facultativo de responder y otorgar la respectiva información solicitada.

4. En todos los casos en los que se recopilen datos, se deberá informar los derechos que le asisten a todos los titulares respecto a sus datos.

5. La compañía debe informar la identificación, dirección física o electrónica y teléfono de la persona o área que tendrá la calidad de responsable del tratamiento.

6. La compañía, deberá garantizar en todo tiempo al titular de la información, el pleno y efectivo ejercicio del derecho al hábeas data y de petición, es decir, la posibilidad de conocer la información que sobre él exista o repose en el banco de datos, solicitar la actualización o corrección de datos y tramitar consultas, todo lo cual se realizará por conducto de los mecanismos de consultas o reclamos previstos en la presente política.

7. La compañía deberá conservar con las debidas seguridades los registros de datos personales almacenados para impedir su deterioro, pérdida, alteración, uso no autorizado o fraudulento y realizar periódica y oportunamente la actualización y rectificación de los datos, cada vez que los titulares de los mismos le reporten novedades o solicitudes.

MANIFESTACION VOLUNTARIA DE LOS DATOS PERSONALES.

Al momento de suministrar voluntariamente tus Datos Personales y/o conceder la autorización por escrito, manifiestas que:

1. Voluntariamente suministras tus Datos Personales y autoriza expresa e inequívocamente para recolectar tus Datos Personales y cualquier otra información que suministre, y para realizar cualquier otro Tratamiento sobre tus datos personales, de acuerdo con lo que señala esta Política.

2. Fuiste informado y entiende que los Datos Sensibles son aquellos que afectan la intimidad del Titular o cuyo uso indebido puede generar discriminación. Así mismo, que ellos pueden identificarse como los de origen racial o étnico, orientación política, convicciones religiosas o filosóficas, pertenencia a sindicatos, organizaciones sociales, datos relacionados con el estado de salud, la vida sexual y los datos biométricos.

3. Fuiste informado de que, en caso de recolección de Datos Sensibles, tiene derecho a no entregar los datos solicitados y entiende y acepta que en algunos casos, si no nos otorga la autorización para el Tratamiento de tus Datos Personales, no podremos continuar con la validación de su identidad, y por ende no podremos prestar nuestros Servicios.

4. Fuiste informado acerca de las finalidades para las cuales se utilizarán tus Datos Personales y Datos Sensibles recolectados, los cuales se encuentran descritos en esta Política.

5. Fuiste informado y comprende las medidas de seguridad que se implementa para brindar protección a los Datos Personales que recolecta y, por tanto, acepta las mismas.

6. Fuiste informado acerca de tus derechos en relación con tus Datos Personales y mecanismos para ejercerlos.

MEDIDAS DE SEGURIDAD PARA LA PROTECCION DE DATOS PERSONALES

Todos los datos personales son recolectados y almacenados en servidores ubicados en la nube y algunos físicamente, con acceso restringido y los cuales no son compartidos con terceros diferentes a la compañía ni comercializados con entidad alguna.

Además, implementamos medidas de protección humanas, administrativas y técnicas que razonablemente están a nuestro alcance. Con las medidas que tomamos, podemos asegurar que evitaremos violaciones de seguridad que afecten tus datos personales en la mayor medida posible.

Dentro de las políticas de seguridad informática tenemos las siguientes:

1. Políticas en la Infraestructura tecnológica perimetral en la red de datos (Sistema de prevención de intrusos (IPS), Firewalls, correo seguro, control de contenido, antivirus.

2. Políticas en la Infraestructura tecnológica y políticas de control de acceso a la información, aplicaciones y bases de datos.

3. Políticas de implementación tecnológica que protegen los computadores y servidores de la organización de malware.

4. Políticas de implementación tecnológica que respalda la información contenida en las distintas plataformas.

PROCEDIMIENTO PARA EL TRÁMITE DE RECLAMOS O SOLICITUDES

Toda solicitud, petición, queja o reclamo (PQR) que sea presentada a EUROCAR RENTAL SAS por parte de cualquier titular respecto al manejo y tratamiento dado a su información será resuelta de conformidad con la ley regulatoria al derecho al habeas data y será tramitado bajo las siguientes reglas:

La petición o reclamo se formulará mediante escrito o cualquier otro de los medios definidos en la presente política para tal fin, dirigido a EUROCAR RENTAL SAS, con la identificación del titular, la descripción de los hechos que dan lugar al reclamo, la dirección o medio a través del cual desea obtener su respuesta, y si fuere el caso, acompañando los documentos de soporte que se quieran hacer valer al correo jennygomez@eurocarental.com.

En caso de que el escrito resulte incompleto, la compañía solicitará al interesado para que subsane las fallas dentro de los cinco (5) días siguientes a la recepción del reclamo. Transcurridos dos meses desde la fecha del requerimiento, sin que el solicitante presente la información requerida, se entenderá que ha desistido de la reclamación o petición.

Una vez recibida la petición o reclamo completo, dicha información deberá mantenerse hasta que el reclamo sea decidido.

El solicitante recibirá una respuesta por parte de EUROCAR RENTAL SAS, dentro de los diez (10) días hábiles siguientes contados a partir de la fecha en la cual ha tenido conocimiento efectivo de la solicitud.

Cuando no fuere posible atender la petición dentro de dicho término, se informará al interesado, expresando los motivos de la demora y señalando la fecha en que se atenderá su petición, la cual en ningún caso podrá superar los cinco (5) días hábiles siguientes al vencimiento del primer término.

La Política de manejo de la información personal podrá ser consultada en www.Eurocarrental.com

RESPONSABLE Y ENCARGADO DEL TRATAMIENTO:

EUROCAR RENTAL SAS
Domicilio principal: CL 26 69 C 03.
Correo electrónico jennygomez@eurocarental.com
Actualizado 20 de noviembre de 2025`;

export const LegalDocumentsModal = ({ type, trigger }: LegalDocumentsModalProps) => {
  const isTerms = type === "terms";
  const title = isTerms ? "Términos y Condiciones" : "Política de Tratamiento de Datos Personales";
  const content = isTerms ? TERMINOS_CONDICIONES : POLITICA_DATOS;
  const Icon = isTerms ? FileText : Shield;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
