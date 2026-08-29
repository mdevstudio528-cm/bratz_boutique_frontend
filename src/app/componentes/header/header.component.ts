import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  title = 'Las Bratz';

  readonly facebookUrl = 'https://www.facebook.com/Lasbratzboutique?locale=es_LA';
  readonly mapsUrl     = 'https://maps.app.goo.gl/eQ1iAgRphf7hV2BBA';
  readonly whatsappUrl =
    'https://wa.me/7711513192?text=' +
    encodeURIComponent('Hola! Vengo de la pagina de Las Bratz Boutique y quiero informacion.');
}
